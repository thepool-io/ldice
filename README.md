# ldice
Proof of concept of provably fair dice game made with lisk-sdk

```
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

-Prepare genesis and network config<br>
-Ensure that malicious delegate will fork<br>
-undoAsset in case of drawing module failure<br>

# credits
Corbifex | Moosty