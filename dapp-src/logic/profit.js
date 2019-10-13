'use strict';
const {BigNum} = require('lisk-sdk');

module.exports = class Profit {
    constructor(betNumber, betAmount) {
      this.betNumber = betNumber;
      this.betAmount = new BigNum(betAmount);
    }
    get() {
      let pureProfit = BigNum(this.betAmount.mul(new BigNum(100 - this.betNumber)).div(this.betNumber).add(this.betAmount).mul(990).div(1000).sub(this.betAmount));
      //remove floating point, probably should be done differently, but BigNum lacks of this feature?
      if (pureProfit.toString().includes(".")) {
        pureProfit = new BigNum(pureProfit.toString().split(".")[0]);
      }
      return pureProfit;
    }
}