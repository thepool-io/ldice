# ldice
Proof of concept of provably fair dice game

```
npm install
sudo node index.js | npx bunyan -o short
```

# todo
-Implement treasury for native token
-Implement way to gamble with multiple tokens
-Max profit limited by % of current treasury holdings for specific token
-Native token rights to profit, from the treasury revenue (dividends)
-Verify and debug undoAsset (current code totally untested)
-Proper client side application
-Additional verifications in validateAsset