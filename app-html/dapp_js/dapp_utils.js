const LiskNode = new lisk.APIClient([GLOBAL_DAPP_NODE])
const getTimestamp = () => {
    const StartDate = GLOBAL_DAPP_START_TIME;
    const millisSinceEpoc = Date.now() - Date.parse(StartDate);
    const inSeconds = ((millisSinceEpoc) / 1000).toFixed(0);
    return  parseInt(inSeconds);
};