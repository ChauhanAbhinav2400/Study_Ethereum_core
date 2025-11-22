require("dotenv").config();
const { ethers } = require("ethers");
console.log(process.env.WSS_URL);

const provider = new ethers.WebSocketProvider(process.env.WSS_URL);

const UNI_V2_SELECTORS = {
  swapExactTokensForTokens: "0x38ed1739",
  swapTokensForExactTokens: "0x8803dbee",
};

const UNI_V3_SELECTORS = {
  exactInputSingle: "0x04e45aaf",
  exactInput: "0xb858183f",
};

function decodeIfSwap(tx) {
  const input = tx.data.toLowerCase();

  for (let selector of Object.values(UNI_V2_SELECTORS)) {
    if (input.startsWith(selector)) {
      console.log("⚡ Uniswap V2 Swap Detected");
      console.log("From:", tx.from);
      console.log("To:", tx.to);
      console.log("Gas:", tx.gasLimit.toString());
      console.log("Value:", tx.value.toString());
      return;
    }
  }

  for (let selector of Object.values(UNI_V3_SELECTORS)) {
    if (input.startsWith(selector)) {
      console.log("⚡ Uniswap V3 Swap Detected");
      console.log("From:", tx.from);
      console.log("To:", tx.to);
      console.log("Gas:", tx.gasLimit.toString());
      console.log("Value:", tx.value.toString());
      return;
    }
  }
}

provider.on("pending", async (txHash) => {
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx) return;
    if (!tx.to || !tx.data || tx.data === "0x") return;
    console.log("🔍 New pending tx:", txHash);
    decodeIfSwap(tx);
  } catch (error) {
    console.log(error);
  }
});
