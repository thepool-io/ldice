'use strict';

module.exports = ({components, channel}, socket) => {
    channel.subscribe('chain:blocks:change', async event => {
        socket.emit('node', {height: event.data.height, lastBlockId: event.data.id, blockSignature: event.data.blockSignature, currentNodeTs:Date.now()});
    });
   	channel.subscribe('drawing:newbet', async event => {
        socket.emit('bets', event.data);
    });
};