const {Application} = require('lisk-sdk');
const fs = require("fs");
const BetTransaction = require('./actions/bet');
const RollModule = require('./modules/roll');
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
app.registerTransaction(BetTransaction);

app.run().then(() => app.logger.info('App started...')).catch(error => {
	console.error('Faced error in application', error);
	process.exit(1);
});