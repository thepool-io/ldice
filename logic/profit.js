'use strict';

module.exports = class Profit {
    constructor(betNumber, betAmount) {
      this.betNumber = BigInt(betNumber);
      this.betAmount = BigInt(betAmount);
    }
    get() {
      let pureProfit = this.betAmount*(BigInt(100)-this.betNumber)/this.betNumber+this.betAmount*BigInt(990)/BigInt(1000)-this.betAmount;
      //remove floating point, probably should be done differently, but BigNum/BigInt lacks of this feature? CHECK AFTER BIGNUM->BigInt
      if (pureProfit.toString().includes(".")) {
        pureProfit = BigInt(pureProfit.toString().split(".")[0]);
      }
      return pureProfit;
    }
}