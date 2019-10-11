class BetTransaction extends lisk.transactions.BaseTransaction {
    static get TYPE () {
        return 1001;
    }
    static get FEE () {
        return `${10 ** 7}`;
    };
}
