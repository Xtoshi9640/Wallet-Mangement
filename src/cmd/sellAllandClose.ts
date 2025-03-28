import chalk from "chalk";
import { wallet } from "../config/config";
import { sellTokenSwap } from "../swap/sell";
import { multiClose } from "../swap/mutiClose";
import { displayTokenTable, getWalletTokens, sleepTime } from "../utils/utils";

export async function tokenSellAllAndClose() {
  const tokens = await getWalletTokens(wallet.publicKey);
  if(tokens.length === 0) {
    console.log(chalk.red("No tokens found in your wallet."));
    return;
  }
  displayTokenTable(tokens);

  const zeros = tokens.filter((token) => token.amount === 0).map((token) => token.mint);
  const nonZeros = tokens.filter((token) => token.amount > 0);
  const verbs = tokens.length > 0 ? "are" : "is";

  console.log(
    `[ - ] Sell All: started. There ${verbs} ${tokens.length} tokens in your wallet.`
  );

  const ataClose = await multiClose(zeros);
  if(!ataClose) {
    console.log(chalk.red("[ - ] ATA Close: failed."));
    return;
  }

  const BATCH_SIZE = 5;
  if(nonZeros) for (let i = 0; i < nonZeros.length; i += BATCH_SIZE) {
    const tokenBatch = nonZeros.slice(i, i + BATCH_SIZE);
    await Promise.all(
      tokenBatch.map((token) => sellTokenSwap(token.mint, token.amount, true))
    );
    await sleepTime(1000);
  }

  await sleepTime(2000);
  const now_tokens = await getWalletTokens(wallet.publicKey);
  if (now_tokens.length > 0) {
    console.log(chalk.red(`[ - ] token Close: failed. There are ${now_tokens.length} tokens in your wallet.`));
    return;
  }
  console.log(chalk.green(`[ - ] token Close: success. There are no tokens in your wallet.`));
}
