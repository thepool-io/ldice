'use strict';
const Prando = require('prando');
const Profit = require('./profit.js');

module.exports = class Draw {
    constructor(blockHash, txHash, betNumber, betAmount) {
        this.blockHash = blockHash;
        this.txHash = txHash;
        this.betNumber = betNumber;
        this.betAmount = betAmount;
    }
    get() {
        //init Prando with blockHash and txHash as deterministic base
        const rng = new Prando(this.blockHash + this.txHash);

        //get result
        const rolledNumber = rng.nextInt(1, 100);

        const betNumber = parseInt(this.betNumber) - 1;
        const betAmount = BigInt(this.betAmount);

        let totalProfit = BigInt(0);
        let pureProfit = BigInt(0);
        let betWon = false;

        //check if bet won or lost
        if (rolledNumber <= betNumber) {
          //calculate pure profit
          pureProfit = new Profit(betNumber,betAmount).get();
          //calculate total profit
          totalProfit = betAmount+pureProfit;
          betWon = true;
        } else {
          //deduce cost of bet
          totalProfit = BigInt(-betAmount);
          pureProfit = BigInt(-betAmount);
          betWon = false;
        }
        return {totalProfit: totalProfit, pureProfit: pureProfit, rolledNumber: rolledNumber, betNumber: betNumber, betWon: betWon};
    }
}
