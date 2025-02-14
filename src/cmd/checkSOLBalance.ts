import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { connection, wallet } from "../config/config";
import { getSolPrice } from "../utils/utils";
import chalk from "chalk";

export async function checkSolBalance() {
  const balance = await connection.getBalance(wallet.publicKey);
  const sol_price = await getSolPrice();
  const balance_sol = Number((balance / LAMPORTS_PER_SOL));
  const balance_usd = (balance_sol * sol_price).toFixed(5);
  console.log(
    chalk.green(`SOL Balance: ${balance_sol} SOL (${balance_usd} USD)`)
  );
}
