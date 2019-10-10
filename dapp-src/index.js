const { Application, genesisBlockDevnet, configDevnet } = require('lisk-sdk');
const BetTransaction = require('./actions/bet');
const RollModule = require('./modules/roll');

configDevnet.app.label = 'ldice';
configDevnet.modules.http_api.access.public = true;
configDevnet.modules.http_api.access.httpPort = 4000;
configDevnet.modules.http_api.access.address = "0.0.0.0";
configDevnet.app.genesisConfig.EPOCH_TIME = new Date(Date.UTC(2019, 4, 24, 17, 0, 0, 0)).toISOString();
configDevnet.app.genesisConfig.BLOCK_TIME = 5;
configDevnet.app.genesisConfig.REWARDS.MILESTONES = ["50000000","40000000","30000000","20000000","10000000","1000000","100000","10000"];

const app = new Application(genesisBlockDevnet, configDevnet);
// blockHashDistance 1 - 10 default 2
app.registerModule(RollModule, { blockHashDistance: 2 });
app.registerTransaction(BetTransaction);

app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch(error => {
		console.error('Faced error in application', error);
		process.exit(1);
	});
