'use strict';
const {
    transactions: { BaseTransaction },
    TransactionError,
    BigNum,
} = require('lisk-sdk');
const {utils} = require("@liskhq/lisk-transactions");

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
        if (this.asset.bet_number < 2 && this.asset.bet_number > 99) {
            errors.push(
                new TransactionError(
                    '`bet_number` must be between 2 and 99.',
                    this.id,
                    '.bet_number',
                    this.asset.bet_number,
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

        //check if sender has enough balance
        const viableSenderBalance = new BigNum(sender.balance).cmp(this.amount);
        if (viableSenderBalance >= 0) {
            //subtract amount from sender
            const updatedSenderBalance = new BigNum(sender.balance).sub(this.amount);

            //prepare updated sender
            const updatedSender = {
                ...sender,
                balance: updatedSenderBalance.toString(),
            };

            //save sender to db
            store.account.set(updatedSender.address, updatedSender);

            //read recipient or get default
            const recipient = store.account.getOrDefault(this.recipientId);

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
