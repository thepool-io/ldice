'use strict';
'use strict';
const {BigNum} = require('lisk-sdk');
const Prando = require('prando');

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
        const betAmount = new BigNum(this.betAmount);

        let totalProfit = new BigNum(0);
        let pureProfit = new BigNum(0);
        let betWon = false;

        //check if bet won or lost
        if (rolledNumber <= betNumber) {
          //calculate pure profit
          pureProfit = new BigNum(betAmount.mul(new BigNum(100 - betNumber)).div(betNumber).add(betAmount).mul(990).div(1000).sub(betAmount));

          //remove floating point, probably should be done differently, but BigNum lacks of this feature?
          if (pureProfit.toString().includes(".")) {
            pureProfit = new BigNum(pureProfit.toString().split(".")[0]);
          }

          //calculate total profit
          totalProfit = new BigNum(betAmount).add(pureProfit);
          betWon = true;
        } else {
          //deduce cost of bet
          totalProfit = new BigNum(betAmount).neg();
          betWon = false;
        }
        return {totalProfit: totalProfit, pureProfit: pureProfit, rolledNumber: rolledNumber, betWon: betWon};
    }
}
