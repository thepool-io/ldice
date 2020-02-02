# LDICE
Provably fair dice game made with lisk-sdk

Full install guide fresh Ubuntu 18.04
```sh
adduser ldice
usermod -aG sudo ldice
su - ldice
git clone https://github.com/thepool-io/ldice
<<<<<<< HEAD
cd ldice
=======
cd ldice/dapp-src
npm install
createdb lisk_test --owner lisk && psql -d lisk_test -c "alter user lisk with password 'password';"
sudo node index.js | npx bunyan -o short
>>>>>>> c1a9e44ec38fbeea8c9e4f429466b82b8c95ebae
```

Usage
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

<<<<<<< HEAD
# Credits
Corbifex | Moosty
=======
# credits
Corbifex | Moosty
>>>>>>> c1a9e44ec38fbeea8c9e4f429466b82b8c95ebae
