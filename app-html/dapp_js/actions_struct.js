class BetTransaction extends lisk.transactions.BaseTransaction {
    static get TYPE () {
        return 12;
    }
    static get FEE () {
        return `${10 ** 7}`;
    };
}
