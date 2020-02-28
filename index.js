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

const {Application} = require('lisk-sdk');
const fs = require("fs");
const BetTransaction = require('./actions/bet');
const RollModule = require('./modules/roll');
const WebSocketModule = require('./modules/websocket');
const dappGenesis = require('./genesis.json');
let dappConfig;

if (fs.existsSync('./config_dev.json')) {
	dappConfig = require('./config_dev.json');
	console.log("Loaded config_dev.json");
} else {
	dappConfig = require('./config.json');
	console.log("Loaded config.json");
}

const app = new Application(dappGenesis, dappConfig);

app.constants = {
    ...app.constants,
    ...{
        ACTIVE_DELEGATES: 9,
        MAX_VOTES_PER_ACCOUNT: 21,
        TOTAL_AMOUNT: 505000000000000
    }
}

app.registerModule(RollModule, { blockHashDistance: 1 });
app.registerModule(WebSocketModule);
app.registerTransaction(BetTransaction);

app.run().then(() => app.logger.info('App started...')).catch(error => {
	console.error('Faced error in application', error);
	process.exit(1);
});