const {
    transactions: { BaseTransaction },
    TransactionError,
    BigNum,
} = require('lisk-sdk');

class BetTransaction extends BaseTransaction {
    static get TYPE () {
        return 12;
    }
    static get FEE () {
        return `${10 ** 7}`;
    };
    async prepare(store) {
        await store.account.cache([
            {
                address: this.senderId,
            },
        ]);
    }
    validateAsset() {
        const errors = [];
        if (this.asset.bet_number < 2 && this.asset.bet_number > 99) {
            errors.push(new TransactionError('Error',this.id,':',this.amount.toString()));
        }
        if (this.senderId !== this.recipientId) { //allow only sending to self
            errors.push(new TransactionError('Error',this.id,':',this.amount.toString()));
        }
        /*
        TODO
        -Add real error messages when fixed in lisk-sdk
        */
        return errors;
    }
    applyAsset(store) {
        const errors = [];

        //read account and transaction details
        var sender = store.account.get(this.senderId);
        const CurrentBalance = BigNum(sender.balance);
        const BetAmount = BigNum(this.amount);

        // update balance
        sender.balance = CurrentBalance.sub(BetAmount).toString();

        //save
        store.account.set(sender.address, sender);
        return errors;
    }
    undoAsset(store) {
        const errors = [];

        //get current balance
        const CurrentBalance = BigNum(sender.balance);

        //read account info
        const sender = store.account.get(this.senderId);

        //find tx result for this bet
        const bet_result = sender.asset.transaction_results[this.id];

        //read profit
        const PureProfit = bet_result.profit;

        //save reverted amount to sender account
        sender.balance = CurrentBalance.sub(PureProfit).toString();

        //remove bet result from sender asset
        delete sender.asset.transaction_results[this.id];

        //save
        store.account.set(sender.address, sender);
        return errors;
    }
}
module.exports = BetTransaction;
