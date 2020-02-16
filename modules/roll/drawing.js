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

    var ConsistencyCheckArray = Array();

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

        //prepare won & lost variables
        var updatedGamblerWonBets = BigInt(0);
        if (gamblerAccount[0].asset.stats !== undefined) {
          if (gamblerAccount[0].asset.stats.won !== undefined) {
            updatedGamblerWonBets = BigInt(gamblerAccount[0].asset.stats.won);
          }
        }
        var updatedGamblerLostBets = BigInt(0);
        if (gamblerAccount[0].asset.stats !== undefined) {
          if (gamblerAccount[0].asset.stats.lost !== undefined) {
            updatedGamblerLostBets = BigInt(gamblerAccount[0].asset.stats.lost);
          }
        }

        //if bet won, add profit and return bet cost to the gambler. Update stats as well.
        if (drawResult.betWon) {
          //update balance
          newBalance = newBalance+drawResult.totalProfit;
          //update won bets count in stats
          updatedGamblerWonBets = updatedGamblerWonBets + BigInt(1);
        } else {
          //update lost bets count in stats
          updatedGamblerLostBets = updatedGamblerLostBets + BigInt(1);
        }

        //update total profit
        var updatedTotalProfit = BigInt(0);
        if (gamblerAccount[0].asset.stats !== undefined) {
          if (gamblerAccount[0].asset.stats.profit !== undefined) {
            updatedTotalProfit = BigInt(gamblerAccount[0].asset.stats.profit)+drawResult.pureProfit;
          }
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
          ],
          stats: {
            ...gamblerAccount[0].asset.stats,
            lost: updatedGamblerLostBets.toString(),
            won: updatedGamblerWonBets.toString(),
            profit: updatedTotalProfit.toString(),
          },
        };

        //save gambler to db
        await components.storage.entities.Account.updateOne(
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
          await components.storage.entities.Account.updateOne(
            {address: treasuryAddress},
            {
              balance: newTreasuryAccountBalance
          });
        }

        //consitency data
        ConsistencyCheckArray = {
          ...ConsistencyCheckArray,
          [gambler]: {
            total: BigInt(gamblerAccount[0].asset.stats.total).toString(),
            wonAndLost: (updatedGamblerLostBets + updatedGamblerWonBets).toString(),
          }
        }

        //print log
        logger.info(`Bet id:${lastTransactions[i].id} profit:${drawResult.totalProfit.toString()} bet:${drawResult.betNumber.toString()} rolled:${drawResult.rolledNumber.toString()} isWon:${drawResult.betWon} won:${updatedGamblerWonBets} lost:${updatedGamblerLostBets} total:${gamblerAccount[0].asset.stats.total}`);

        //emit new confirmed bet event
        channel.publish('drawing:newbet', {id: lastTransactions[i].id, senderId: gambler, senderBalanceAfter: newBalance.toString(), treasuryBalanceAfter: newTreasuryAccountBalance.toString(), profit: drawResult.totalProfit.toString(), bet: drawResult.betNumber.toString(), rolled: drawResult.rolledNumber.toString()});
      }
    }
    //Consistency check
    var TotalOfTotal = BigInt(0);
    var TotalOfWonAndLost = BigInt(0);
    for (let key in ConsistencyCheckArray) { //Blockchain state might be inconsistent if node crashed or was closed during this function processing.
      let value =  ConsistencyCheckArray[key];
      TotalOfTotal = TotalOfTotal + BigInt(value.total);
      TotalOfWonAndLost =  TotalOfWonAndLost + BigInt(value.wonAndLost);
      if (BigInt(value.total)!=BigInt(value.wonAndLost)) {
        console.log(ConsistencyCheckArray);
        logger.error(`Block:${lastBlocks[config.blockHashDistance - 1].id} - Inconsistency occurred. This should NOT happen. Closing to investigate.`);
        //process.exit(1); - exit disabled for now to fully understand consistency issue
      }
    }
    logger.info(`Block:${lastBlocks[config.blockHashDistance - 1].id} fully processed. Consistency:${TotalOfWonAndLost}/${TotalOfTotal}`);
    ConsistencyCheckArray = Array();
  });
};
