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

    // Get height of currently processed bets
    const BlockHeight = lastBlocks[config.blockHashDistance - 1].height;

    var ConsistencyCheckArray = Array();
    var GamblersArray = Array();

    if (lastTransactions.length > 0) {
      // Loop through transactions
      for (let i = 0; i < lastTransactions.length; i++) {
        //Get gambler account id
        const gambler = lastTransactions[i].senderId;

        //Prepare gamblerAccount object
        var gamblerAccount = [];

        //Read gambler from db only once if many bets
        if (!GamblersArray[gambler]) {
          gamblerAccount = await components.storage.entities.Account.get(
          {address: gambler}, {extended: true, limit: 1});
          GamblersArray[gambler] = gamblerAccount;
        } else {
          gamblerAccount = GamblersArray[gambler];
        }

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

        /*
        Remove old account.asset.transaction_results *experimental*
        Results are deterministic, there is no need to store results, however it is necessary
        because undoAsset has limited database access and the only way to reverse transactions properly
        is to store them in account.asset, however above 1000 transactions per account there is significant
        performance drop. It can be assumed that there is no need to rollback (use undoAsset) after N blocks,
        especially with BFT finality. It might work as workaround in current situation. Whilst lisk-hq is working
        on expanding database access for custom transactions and/or add block logic extensibility. 
        */
        const SafeBFTFinality = 134; //Finality 67*2 - 12tx per block * 134 = max ~1.6k tx stored in account.asset
        const NumberOfTransactionsAllowedInAccountAsset = 50; //Assuming they are old, it can be more.
        if (gamblerAccount[0].asset.transaction_results) {
          const NumberOfBetsStored = gamblerAccount[0].asset.transaction_results.length;
          var NewArrayOfTransactionResults = Array();
          if (NumberOfBetsStored > NumberOfTransactionsAllowedInAccountAsset) {
            for (let key in gamblerAccount[0].asset.transaction_results) {
              const object =  gamblerAccount[0].asset.transaction_results[key];
              const betId = Object.keys(object)[0];
              const betIdObject = object[betId];
              const heightMaturity = BlockHeight - betIdObject.atHeight
              if (heightMaturity > SafeBFTFinality) {
                logger.info(`Removing mature bet with key:${key} betId:${betId} heightMaturity:${heightMaturity}`);
              } else {
                NewArrayOfTransactionResults = [...NewArrayOfTransactionResults || [],
                  {
                    [betId]:
                      {
                        bet_number: betIdObject.bet_number,
                        profit: betIdObject.profit,
                        rolled_number: betIdObject.rolled_number,
                        atHeight: betIdObject.atHeight,
                      }
                  }
                ]
              }
            }
            logger.info(`Number of old bets stored after cleaning:${NewArrayOfTransactionResults.length}/${NumberOfBetsStored}`);
          } else { 
            NewArrayOfTransactionResults = gamblerAccount[0].asset.transaction_results;
          }
        }

        //Update account balance and bet results array
        const betResults = {
          ...gamblerAccount[0].asset,
          transaction_results: [
            ...NewArrayOfTransactionResults || [],
            {
              [lastTransactions[i].id]:
                { //these are necessary to store only to enable undoAsset to properly unwind transactions
                  bet_number: lastTransactions[i].asset.data,
                  profit: drawResult.totalProfit.toString(),
                  rolled_number: drawResult.rolledNumber,
                  atHeight: BlockHeight,
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

        //save bet results to gambler temp state
        GamblersArray[gambler][0].balance = newBalance.toString();
        GamblersArray[gambler][0].asset = betResults;

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
        logger.info(`Bet id:${lastTransactions[i].id} profit:${drawResult.totalProfit.toString()} bet:${drawResult.betNumber.toString()} rolled:${drawResult.rolledNumber.toString()} isWon:${drawResult.betWon} won:${updatedGamblerWonBets} lost:${updatedGamblerLostBets} total:${gamblerAccount[0].asset.stats.total} atHeight:${BlockHeight}`);

        //emit new confirmed bet event
        channel.publish('drawing:newbet', {id: lastTransactions[i].id, senderId: gambler, senderBalanceAfter: newBalance.toString(), treasuryBalanceAfter: newTreasuryAccountBalance.toString(), profit: drawResult.totalProfit.toString(), bet: drawResult.betNumber.toString(), rolled: drawResult.rolledNumber.toString()});
      }
      //Save db state for each gambler
      for (let gambler in GamblersArray) {
        let gamblerObject =  GamblersArray[gambler];
        logger.info(`Saving db state for:${gambler}`);
        await components.storage.entities.Account.updateOne(
          {address: gambler},
          {
            balance: gamblerObject[0].balance,
            asset: gamblerObject[0].asset,
        });
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
