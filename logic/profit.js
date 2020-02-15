'use strict';

module.exports = class Profit {
    constructor(betNumber, betAmount) {
      this.betNumber = BigInt(betNumber);
      this.betAmount = BigInt(betAmount);
      this.houseEdge = 990;// = 99% (1% houseEdge)
      this.houseEdgeDivisor = 1000;
    }
    get() {
      let pureProfit = this.betAmount*(BigInt(100)-this.betNumber)/this.betNumber+this.betAmount*BigInt(this.houseEdge)/BigInt(this.houseEdgeDivisor)-this.betAmount;
      return pureProfit;
    }
}