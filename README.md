# ldice
Proof of concept of provably fair dice game made with lisk-sdk

Node.js 10.15.3+ Required

Postgreqsql install
```
sudo apt-get purge -y postgres* # remove all already installed postgres versions
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
sudo apt install wget ca-certificates
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install postgresql-10
pg_lsclusters
sudo pg_dropcluster --stop 10 main
sudo pg_createcluster --locale en_US.UTF-8 --start 10 main
sudo -u postgres createuser --createdb lisk
```

ldice install
```
git clone https://github.com/thepool-io/ldice
npm install
createdb lisk_test --owner lisk && psql -d lisk_test -c "alter user lisk with password 'password';"
sudo node index.js | npx bunyan -o short
```

Cleanup
```
dropdb lisk_test && createdb lisk_test --owner lisk && psql -d lisk_test -c "alter user lisk with password 'password';"
```

# todo
-Native token rights to profit, from the treasury revenue (dividends)<br>
-Extend treasury and betting to custom tokens<br>
-Verify and debug undoAsset (current code totally untested)<br>
-Proper client side application<br>

-chain:blocks:change won't be called during sync (Urgent fix)<br>
-Ensure that malicious delegate will fork<br>
-undoAsset in case of drawing module failure<br>

# credits
Corbifex | Moosty