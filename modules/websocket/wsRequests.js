'use strict';
const Draw = require('../../logic/draw.js');

module.exports = ({components}, socket) => {
    socket.on('account', async (json) => {
        if (json.address) {
            const address = json.address.toString();
            if (address.length > 1) {
                const account = await components.storage.entities.Account.get({address: address}, {limit: 1});
                if (account[0]) {
                    if (json.full) {
                        socket.emit('account', {balance: account[0].balance, stats: account[0].asset.stats, transaction_results: account[0].asset.transaction_results});
                    } else {
                        socket.emit('account', {balance: account[0].balance, stats: account[0].asset.stats});
                    }
                } else {
                    socket.emit('account', 'Account not found');
                }
            }
        }
    });

    socket.on('status', async () => {
        const lastBlock = await components.storage.entities.Block.get({}, {sort: 'height:desc', limit: 1});
        const treasuryAccount = await components.storage.entities.Account.get({address: "0L"}, {limit: 1});
        socket.emit('status', {treasuryAccountBalance: treasuryAccount[0].balance,height: lastBlock[0].height, lastBlockId: lastBlock[0].id, blockSignature: lastBlock[0].blockSignature, currentNodeTs:Date.now()});
    });

    socket.on('lastbets', async () => {
        const lastbets = await components.storage.entities.Transaction.get({type: 1001}, {sort: 'timestamp:desc', limit: 1000, extended: true});
        var tidyLastBets = Array();
        if (lastbets.length > 0) {
            for (let i = 0; i < lastbets.length; i++) {
                const block = await components.storage.entities.Block.get({id: lastbets[i].blockId}, {sort: 'height:desc', limit: 1});
                const drawResult = new Draw(block[0].blockSignature, //Get deterministic bet results
                                            lastbets[i].signature,
                                            lastbets[i].asset.data,
                                            lastbets[i].asset.amount).get();
                tidyLastBets = [...tidyLastBets, {id: lastbets[i].id, sender: lastbets[i].senderId, profit: drawResult.totalProfit.toString(), bet_number: drawResult.betNumber.toString(), rolled_number: drawResult.rolledNumber.toString()}]
            }
        }
        socket.emit(`lastbets`, tidyLastBets);
    });
}