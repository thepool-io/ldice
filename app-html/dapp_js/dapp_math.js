function CalculateBetProfit(BetAmount,NumberOfBet){
	return ((((BetAmount * (100-parseInt(NumberOfBet))) / parseInt(NumberOfBet)+BetAmount))*GLOBAL_EDGE/GLOBAL_EDGE_DIVISOR)-BetAmount;
}