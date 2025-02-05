import chalk from "chalk";
import { wallet } from "../config/config";
import { sellTokenSwap } from "../swap/sell";
import { displayTokenTable, getWalletTokens, sleepTime } from "../utils/utils";

export async function tokenSellAllAndClose() {
  const tokens = await getWalletTokens(wallet.publicKey);
  if(tokens.length === 0) {
    console.log(chalk.red("No tokens found in your wallet."));
    return;
  }
  displayTokenTable(tokens);
  console.log(
    `[ - ] token Close: started. There are ${tokens.length} tokens in your wallet.`
  );
  const BATCH_SIZE = 5;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const tokenBatch = tokens.slice(i, i + BATCH_SIZE);
    await Promise.all(
      tokenBatch.map((token) => sellTokenSwap(token.mint, token.amount, true))
    );
    await sleepTime(1000);
  }
  const now_tokens = await getWalletTokens(wallet.publicKey);
  if (now_tokens.length > 0) {
    console.log(chalk.red(`[ - ] token Close: failed. There are ${now_tokens.length} tokens in your wallet.`));
  }
  else {
    console.log(chalk.green(`[ - ] token Close: success. There are no tokens in your wallet.`));
  }
}
