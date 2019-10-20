'use strict';
const {
    transactions: { BaseTransaction },
    TransactionError,
    BigNum,
} = require('lisk-sdk');
const {utils} = require("@liskhq/lisk-transactions");
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
                address: this.recipientId,
            },
        ]);
    }
    validateAsset() {
        const errors = [];
        if (!utils.validateTransferAmount(this.amount.toString())) {
            errors.push(
                new TransactionError(
                    'Amount must be a valid number in string format.',
                    this.id,
                    '.amount',
                    this.amount.toString(),
                ),
            );
        }
        if (this.recipientId !== "0L") {
            errors.push(
                new TransactionError(
                    '`recipientId` must be treasury.',
                    this.id,
                    '.recipientId',
                ),
            );
        }
        if (parseInt(this.asset.data) < 2 && parseInt(this.asset.data) > 99) {
            errors.push(
                new TransactionError(
                    '`bet_number` must be between 2 and 99.',
                    this.id,
                    '.bet_number',
                    this.asset.data,
                ),
            );
        }
        //check if bet amount meets minimum size requirement
        const viableBetAmount = new BigNum(this.amount).cmp(BigNum(10000000));//min bet size = 0.1
        if (viableBetAmount < 0) {
            errors.push(
                new TransactionError(
                    'minimum bet is 0.1 LSK',
                    this.id,
                    'amount:',
                    this.amount,
                ),
            );
        }
        /*
        TODO
        -Check all error messages when fixed in lisk-sdk
        */
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
            this.amount,
            this.fee,
        );
        if (balanceError) {
            errors.push(balanceError);
        }

        //read recipient or get default
        const recipient = store.account.getOrDefault(this.recipientId);

        //calculate possible profit
        const pureProfit = new Profit(parseInt(this.asset.data-1),this.amount).get();

        //get current max profit
        const currentMaxProfit = new BigNum(recipient.balance).div(100);//max profit = 0.01 of treasury

        //check if pureProfit lower than max profit
        const viableProfit = currentMaxProfit.cmp(pureProfit);
        if (viableProfit >= 0) {
            //check if sender has enough balance
            const viableSenderBalance = new BigNum(sender.balance).cmp(BigNum(this.amount));
            if (viableSenderBalance >= 0) {
                //subtract amount from sender
                const updatedSenderBalance = new BigNum(sender.balance).sub(BigNum(this.amount));

                //prepare updated sender
                const updatedSender = {
                    ...sender,
                    balance: updatedSenderBalance.toString(),
                };

                //save sender to db
                store.account.set(updatedSender.address, updatedSender);

                //add balance to recipient (treasury)
                const updatedRecipientBalance = new BigNum(recipient.balance).add(
                    this.amount,
                );

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
                        'sender has not enough balance',
                        sender.balance,
                        '/',
                        this.amount,
                    ),
                );
            }
        } else {
            errors.push(
                new TransactionError(
                    'max profit reached (decrease bet amount or increase probability)->',
                    pureProfit,
                    '/',
                    currentMaxProfit,
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
        const updatedSenderBalance = new BigNum(sender.balance).sub(bet_result.profit);

        //prepare new sender
        const updatedSender = {
            ...sender,
            balance: updatedSenderBalance.toString(),
        };

        //save updated sender to db
        store.account.set(updatedSender.address, updatedSender);

        //read recipient (treasury)
        const recipient = store.account.getOrDefault(this.recipientId);

        //verify amount
        const balanceError = verifyBalance(this.id, recipient, this.amount);
        if (balanceError) {
            errors.push(balanceError);
        }

        //deduce bet amount from recipient (treasury)
        const updatedRecipientBalance = new BigNum(recipient.balance).sub(
            this.amount,
        );

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
