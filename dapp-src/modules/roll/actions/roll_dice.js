'use strict';
const {BigNum} = require('lisk-sdk');
const Prando = require('prando');

module.exports = ({components, channel, config}, logger) => {
  channel.subscribe('chain:blocks:change', async event => {
    const lastBlocks = await components.storage.entities.Block.get(
      {}, {sort: 'height:desc', limit: 10});
    // Create previous blocks hash
    let blockHash = "";
    for (let i = 0; i < config.blockHashDistance; i++) {
      blockHash += lastBlocks[i].blockSignature;
    }

    // Get transactions ready for rolling dice
    const lastTransactions = await components.storage.entities.Transaction.get(
      {blockId: lastBlocks[config.blockHashDistance - 1].id, type: 12}, {extended: true, limit: 25});

    if (lastTransactions.length > 0) {
      // Loop through transactions
      for (let i = 0; i < lastTransactions.length; i++) {
        // Role dice
        const rng = new Prando(blockHash + lastTransactions[i].signature);
        const rolledNumber = rng.nextInt(1, 100);
        const betNumber = parseInt(lastTransactions[i].asset.bet_number) - 1;
        const betAmount = new BigNum(lastTransactions[i].amount);
        const gambler = lastTransactions[i].senderId;
        const gamblerAccount = await components.storage.entities.Account.get(
          {address: gambler}, {extended: true, limit: 1});

        let totalProfit = new BigNum(0);
        let newBalance = new BigNum(gamblerAccount[0].balance).toString();
        let pureProfit = new BigNum(-betAmount);

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
          newBalance = new BigNum(gamblerAccount[0].balance).add(totalProfit.toString()).toString();

        } else {
          totalProfit = new BigNum(`-${betAmount}`);
          //remove floating point, probably should be done differently, but BigNum lacks of this feature?
          if (pureProfit.toString().includes(".")) {
            pureProfit = new BigNum(pureProfit.toString().split(".")[0]);
          }
        }

        // Update account balance and bet results
        const betResults = {
          ...gamblerAccount[0].asset,
          transaction_results: [
            ...gamblerAccount[0].asset.transaction_results || [],
            {
              [lastTransactions[i].id]:
                {
                  bet_number: betNumber,
                  profit: totalProfit.toString(),
                  rolled_number:
                  rolledNumber
                }
            }
          ]
        };
        components.storage.entities.Account.updateOne(
          {address: gambler},
          {
            balance: newBalance,
            asset: betResults
          });
        logger.info(`Bet id: ${lastTransactions[i].id} profit: ${totalProfit} bet: ${betNumber} rolled: ${rolledNumber}`);
      }
    }
  });
};
