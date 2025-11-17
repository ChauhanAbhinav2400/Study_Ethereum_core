async function getPriceFromBinance(symbol) {
  let url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
  let resp = await fetch(url);
  let data = await resp.json();
  return parseFloat(data.price);
}
async function getPriceFromUniswap(tokenA, tokenB) {
  let url = `https://api.uniswap.org/v1/quote?tokenIn=${tokenA}&tokenOut=${tokenB}`;
  let resp = await fetch(url);
  let data = await resp.json();
  return parseFloat(data.quote);
}

function calculateFees(amount, priceBuy, priceSell) {
  let tradingFeeRate = 0.001;
  let feeBuy = amount * priceBuy * tradingFeeRate;
  let feeSell = amount * priceSell * tradingFeeRate;
  return feeBuy + feeSell;
}

async function arbitrageBot() {
  let priceOnBinance = await getPriceFromBinance("ETHUSDT");
  let priceOnUniswap = await getPriceFromUniswap("ETH", "USDT");
  console.log(priceOnBinance, priceOnUniswap, "prices");

  if (priceOnBinance < priceOnUniswap) {
    let profit;
    let amountToTrade = 1;
    profit =
      priceOnUniswap * amountToTrade -
      priceOnBinance * amountToTrade -
      calculateFees(amountToTrade, priceOnBinance, priceOnUniswap);
    if (profit > 0) {
      buyOnBinance("ETHUSDT", amountToTrade);
      sellOnUniswap("ETHUSDT", amountToTrade);
      console.log(`Arbitrage executed! Profit: $${profit.toFixed(2)}`);
    }
  }
  if (priceOnUniswap < priceOnBinance) {
    let profit;
    let amountToTrade = 1;
    profit =
      priceOnBinance * amountToTrade -
      priceOnUniswap * amountToTrade -
      calculateFees(amountToTrade, priceOnUniswap, priceOnBinance);
    if (profit > 0) {
      buyOnUniswap("ETHUSDT", amountToTrade);
      sellOnBinance("ETHUSDT", amountToTrade);
      console.log(`Arbitrage executed! Profit: $${profit.toFixed(2)}`);
    }
  }
}
