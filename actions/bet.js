/*
MIT License

Copyright (c) 2020 ThePool.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict';
const {transactions: { BaseTransaction }} = require('lisk-sdk');
const {utils, TransactionError} = require("@liskhq/lisk-transactions");
const {isValidTransferAmount} = require("@liskhq/lisk-validator");
const Profit = require('../logic/profit.js');

class BetTransaction extends BaseTransaction {
    static get TYPE () {
        return 1001;
    }
    static get FEE () {
        return `${10 ** 7}`;
    };
    async prepare(store) {
        await store.account.cache([
            {
                address: this.senderId,
            },
            {
                address: this.asset.recipientId,
            },
        ]);
    }
    assetFromSync(raw){
        if (raw.tf_data) {
          // This line will throw if there is an error
          const data = raw.tf_data.toString('utf8');
          return { data };
        }
        return undefined;
    }
    assetToBytes() {
        const { data } = this.asset;
        return data ? Buffer.from(data, 'utf8') : Buffer.alloc(0);
    }
    validateAsset() {
        const errors = [];

        if (!isValidTransferAmount(this.asset.amount.toString())) {
            errors.push(
                new TransactionError(
                    'Invalid asset.amount',
                    this.id,
                    '->',
                    this.asset.amount.toString(),
                    "Valid number as string"
                ),
            );
        }

        if (this.asset.recipientId !== "0L") {
            errors.push(
                new TransactionError(
                    '`recipientId` must be treasury.',
                    this.id,
                    '->',
                    this.asset.recipientId,
                    'Must be 0L',
                ),
            );
        }

        if (parseInt(this.asset.data) < 2 && parseInt(this.asset.data) > 99) {
            errors.push(
                new TransactionError(
                    'Invalid data.bet_number',
                    this.id,
                    '->',
                    this.asset.data,
                    'Must be in range of 2 to 99',
                ),
            );
        }
        
        //check if bet amount meets minimum size requirement (0.1)
        const MinimumBetSize = BigInt(10000000);
        if (MinimumBetSize >= BigInt(this.asset.amount)) {
            errors.push(
                new TransactionError(
                    'Bet amount too low',
                    this.id,
                    '->',
                    this.asset.amount,
                    MinimumBetSize.toString(),
                ),
            );
        }
        return errors;
    }
    applyAsset(store) {
        const errors = [];

        //read sender account details
        const sender = store.account.get(this.senderId);

        //check transaction amount
        const balanceError = utils.verifyAmountBalance(
            this.id,
            sender,
            this.asset.amount,
            this.fee,
        );
        if (balanceError) {
            errors.push(balanceError);
        }

        //read recipient or get default
        const recipient = store.account.getOrDefault(this.asset.recipientId);

        //calculate possible profit
        const pureProfit = new Profit(parseInt(this.asset.data-1),this.asset.amount).get();

        //get current max profit
        const currentMaxProfit = BigInt(recipient.balance)/BigInt(100);//max profit = 0.01 of treasury

        //check if pureProfit lower than max profit
        if (currentMaxProfit > pureProfit) {
            //check if sender has enough balance
            if (BigInt(sender.balance) >= BigInt(this.asset.amount)) {
                //subtract amount from sender
                const updatedSenderBalance = BigInt(sender.balance)-BigInt(this.asset.amount);

                //update total stats
                var updatedSenderTotalBets = BigInt(1);
                if (sender.asset.stats !== undefined) {
                    if (sender.asset.stats.total !== undefined) {
                        updatedSenderTotalBets = BigInt(sender.asset.stats.total)+BigInt(1);
                    }
                }

                //prepare updatedAsset
                const updatedAsset = {
                    ...sender.asset,
                    stats: {
                        ...sender.asset.stats,
                        total: updatedSenderTotalBets.toString(),
                    },
                };

                //prepare updated sender
                const updatedSender = {
                    ...sender,
                    balance: updatedSenderBalance.toString(),
                    asset: updatedAsset,
                };

                //save sender to db
                store.account.set(updatedSender.address, updatedSender);

                //add balance to recipient (treasury)
                const updatedRecipientBalance = BigInt(recipient.balance)+BigInt(this.asset.amount);

                //prepare updated recipient
                const updatedRecipient = {
                    ...recipient,
                    balance: updatedRecipientBalance.toString(),
                };
                //save recipient to db
                store.account.set(updatedRecipient.address, updatedRecipient);
            } else {
                errors.push(
                    new TransactionError(
                        'Sender has not enough balance',
                        this.id,
                        '->',
                        sender.balance,
                        this.asset.amount,
                    ),
                );
            }
        } else {
            errors.push(
                new TransactionError(
                    'Max profit reached',
                    this.id,
                    'Treasury:'+recipient.balance+' Bet: '+this.asset.amount,
                    pureProfit.toString(),
                    currentMaxProfit.toString(),
                ),
            );
        }
        return errors;
    }
    undoAsset(store) {
        const errors = [];

        //get sender account
        const sender = store.account.get(this.senderId);

        //find tx result for this bet
        const bet_result = sender.asset.transaction_results[this.id];

        //return bet value to sender
        const updatedSenderBalance = BigInt(sender.balance)-BigInt(bet_result.profit);

        //update total stats
        const updatedSenderTotalBets = BigInt(sender.asset.stats.total)-BigInt(1);

        //update total profit
        const updatedSenderTotalProfit = BigInt(sender.asset.stats.profit)-BigInt(bet_result.profit);

        //read and store lost stats
        var updatedGamblerLostBets = BigInt(0);
        if (sender.asset.stats !== undefined) { //need to check if it exists, because it may not yet exist
            if (sender.asset.stats.lost !== undefined) {
                updatedGamblerLostBets = BigInt(sender.asset.stats.lost);
            }
        }

        //read and store won stats
        var updatedGamblerWonBets = BigInt(0);
        if (sender.asset.stats !== undefined) { //need to check if it exists, because it may not yet exist
            if (sender.asset.stats.won !== undefined) {
                updatedGamblerWonBets = BigInt(sender.asset.stats.won);
            }
        }

        //revert bet stats count
        if (bet_result.profit.includes("-")) {
            updatedGamblerLostBets = updatedGamblerLostBets - 1;
        } else {
            updatedGamblerWonBets = updatedGamblerWonBets - 1;
        }

        //prepare updatedAsset
        const updatedAsset = {
            ...sender.asset,
            stats: {
                ...sender.asset.stats,
                total: updatedSenderTotalBets.toString(),
                profit: updatedSenderTotalProfit.toString(),
                lost: updatedGamblerLostBets.toString(),
                won: updatedGamblerWonBets.toString(),
            },
        };

        //prepare new sender
        const updatedSender = {
            ...sender,
            balance: updatedSenderBalance.toString(),
            asset: updatedAsset,
        };

        //save updated sender to db
        store.account.set(updatedSender.address, updatedSender);

        //read recipient (treasury)
        const recipient = store.account.getOrDefault(this.asset.recipientId);

        //verify amount
        const balanceError = verifyBalance(this.id, recipient, this.asset.amount);
        if (balanceError) {
            errors.push(balanceError);
        }

        //deduce bet amount from recipient (treasury)
        const updatedRecipientBalance = BigInt(recipient.balance)-BigInt(this.asset.amount);

        //prepare new recipient (treasury)
        const updatedRecipient = {
            ...recipient,
            balance: updatedRecipientBalance.toString(),
        };

        //save updated recipient to db
        store.account.set(updatedRecipient.address, updatedRecipient);

        //remove bet result from sender asset
        delete sender.asset.transaction_results[this.id];

        return errors;
    }
}
module.exports = BetTransaction;
