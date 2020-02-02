# LDICE
Provably fair dice game made with lisk-sdk

Full install guide fresh Ubuntu 18.04
```sh
adduser ldice
usermod -aG sudo ldice
su - ldice
git clone https://github.com/thepool-io/ldice
cd ldice
bash ldice.sh fullpreqinstall
npm install
bash ldice.sh setnet ldice_testnet
bash ldice.sh preparedb
bash ldice.sh start
bash ldice.sh logs
```

Usage help
```sh
#####################################
>>>LDICE - Lisk Dice (LDT) Manager<<<
#####################################
Methods
start - starts ldice node
stop - stops ldice node. Ctrl+C to stop. Wait for graceful exit.
logs - prints current logs
dblogs - prints current database logs
preparedb - prepares database
purgedb - purges & recreates database
readnet - reads current network
setnet - sets network
fullpreqinstall - Installs all dependencies, Ubuntu 18.04 tested.

```

# Tasks to complete
-Native token rights to profit, from the treasury revenue (dividends)<br>
-Verify behaviour undoAsset<br>
-DEX integration<br>

# Credits
Corbifex | Moosty