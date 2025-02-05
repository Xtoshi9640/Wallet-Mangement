import chalk from "chalk";
import { wallet } from "../config/config";
import { displayTokenTable, getWalletTokens } from "../utils/utils";

export async function checkWalletTokens() {
  const tokens = await getWalletTokens(wallet.publicKey);
  if(tokens.length === 0) {
    console.log(chalk.red("No tokens found in your wallet."));
    return;
  }
  else displayTokenTable(tokens);
}
