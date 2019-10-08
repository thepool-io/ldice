const {
    transactions: { BaseTransaction },
    TransactionError,
    BigNum,
} = require('lisk-sdk');

const random = require('random');

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

        //rolling the number
        const rolled_number = random.int(1,100);

        //read account and transaction details
        var sender = store.account.get(this.senderId);
        const CurrentBalance = BigNum(sender.balance);
        const BetNumber = parseInt(this.asset.bet_number-1);
        const BetAmount = BigNum(this.amount);

        //define profit variables
        var PureProfit = BigNum(0);
        var TotalProfit = BigNum(0);

        //check if bet won or lost
        if (rolled_number <= BetNumber) {
            //calculate pure profit
            PureProfit = BetAmount.mul(BigNum(100-BetNumber)).div(BetNumber).add(BetAmount).mul(990).div(1000).sub(BetAmount);

            //remove floating point, probably should be done differently, but BigNum lacks of this feature?
            if (PureProfit.toString().includes(".")) {
                PureProfit = BigNum(PureProfit.toString().split(".")[0]);
            }

            //calculate total profit
            TotalProfit = BetAmount.add(PureProfit);

            //save to sender account
            sender.balance = CurrentBalance.add(PureProfit).toString();
        } else {
            //deduce cost of lost bet
            TotalProfit = BetAmount.neg(BetAmount);

            //save to sender account
            sender.balance = CurrentBalance.sub(BetAmount).toString();
        }

        //prepare result bet to store in sender account asset
        const this_tx = {[this.id]:{bet_number: this.asset.bet_number, profit: TotalProfit.toString(), rolled_number: rolled_number}};
        if (sender.asset.transaction_results === undefined) {
            sender.asset.transaction_results = [];
        }

        //append array with bet result tx
        sender.asset.transaction_results.push(this_tx);

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