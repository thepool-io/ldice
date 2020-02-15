'use strict';
const Prando = require('prando');
const Draw = require('../../logic/draw.js');
const treasuryAddress = "0L";

module.exports = ({components, channel, config}, logger) => {
  channel.subscribe('chain:blocks:change', async event => {
    const lastBlocks = await components.storage.entities.Block.get({}, {sort: 'height:desc', limit: 10});
    
    // Get previous blocks hash
    let blockHash = "";
    for (let i = 0; i < config.blockHashDistance; i++) {
      blockHash += lastBlocks[i].blockSignature;
    }

    // Get transactions ready for rolling dice
    const lastTransactions = await components.storage.entities.Transaction.get(
      {blockId: lastBlocks[config.blockHashDistance - 1].id, type: 1001}, {extended: true, limit: 25});

    if (lastTransactions.length > 0) {
      // Loop through transactions
      for (let i = 0; i < lastTransactions.length; i++) {
        //Get gambler account id
        const gambler = lastTransactions[i].senderId;

        //Read gambler account from db
        const gamblerAccount = await components.storage.entities.Account.get(
          {address: gambler}, {extended: true, limit: 1});

        //draw
        const drawResult = new Draw(blockHash,
                                lastTransactions[i].signature,
                                lastTransactions[i].asset.data,
                                lastTransactions[i].asset.amount).get();

        //update gambler balance
        let newBalance = BigInt(gamblerAccount[0].balance);

        //if bet won, add profit and return bet cost to the gambler
        if (drawResult.betWon) {
          newBalance = newBalance+drawResult.totalProfit;
        }

        //Update account balance and bet results array
        const betResults = {
          ...gamblerAccount[0].asset,
          transaction_results: [
            ...gamblerAccount[0].asset.transaction_results || [],
            {
              [lastTransactions[i].id]:
                { //these are necessary to store only to enable undoAsset to properly unwind transactions
                  bet_number: lastTransactions[i].asset.data,
                  profit: drawResult.totalProfit.toString(),
                  rolled_number: drawResult.rolledNumber
                }
            }
          ]
        };

        //save gambler to db
        components.storage.entities.Account.updateOne(
          {address: gambler},
          {
            balance: newBalance.toString(),
            asset: betResults
        });

        //if bet is won, balance must be deduced from treasuryAccount, if lost - balance already taken
        var newTreasuryAccountBalance = "na";
        if (drawResult.betWon) {
          //read treasury account form db
          const treasuryAccount = await components.storage.entities.Account.get({address: treasuryAddress}, {extended: true, limit: 1});
          newTreasuryAccountBalance = (BigInt(treasuryAccount[0].balance)-drawResult.totalProfit).toString();
          //save gambler to db
          components.storage.entities.Account.updateOne(
            {address: treasuryAddress},
            {
              balance: newTreasuryAccountBalance
          });
        }

        //print log
        logger.info(`Bet id: ${lastTransactions[i].id} profit: ${drawResult.totalProfit.toString()} bet: ${drawResult.betNumber.toString()} rolled: ${drawResult.rolledNumber.toString()}`);

        //emit new confirmed bet event
        channel.publish('drawing:newbet', {id: lastTransactions[i].id, senderId: gambler, senderBalanceAfter: newBalance.toString(), treasuryBalanceAfter: newTreasuryAccountBalance.toString(), profit: drawResult.totalProfit.toString(), bet: drawResult.betNumber.toString(), rolled: drawResult.rolledNumber.toString()});
      }
    }
  });
};
