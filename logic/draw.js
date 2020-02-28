/*
MIT License

Copyright (c) 2020 ThePool.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
