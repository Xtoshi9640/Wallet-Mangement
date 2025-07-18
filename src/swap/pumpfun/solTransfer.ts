import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import chalk from "chalk";
import { connection, wallet } from "../config/config";
import { confirmVtxn } from "../swap/swap";
import { simulateTxn } from "../utils/utils";
import { getLastValidBlockhash } from "../utils/getBlock";

export async function solTransfer(rl: any): Promise<void> {
  return new Promise((resolve) => {
    rl.question("Enter the amount of SOL to transfer: ", (amountStr: any) => {
      rl.question(
        "Enter the recipient's address: ",
        async (toAddress: string) => {
          try {
            const amount = parseFloat(amountStr);

            console.log(
              chalk.yellow(
                `Transferring ${amount} SOL to ${toAddress}...`
              )
            );
            const balance = await connection.getBalance(wallet.publicKey);
            const balance_sol = Number(balance / LAMPORTS_PER_SOL);

            if (amount > balance_sol) {
              resolve();
              console.log(chalk.red("Not enough SOL in your wallet."));
              return;
            }

            const transferInstruction = SystemProgram.transfer({
              fromPubkey: wallet.publicKey,
              toPubkey: new PublicKey(toAddress),
              lamports: amount * LAMPORTS_PER_SOL,
            });

            const blockhash = await getLastValidBlockhash();

            const messageV0 = new TransactionMessage({
              payerKey: wallet.publicKey,
              recentBlockhash: blockhash,
              instructions: [transferInstruction],
            }).compileToV0Message();

            const vTxn = new VersionedTransaction(messageV0);
            vTxn.sign([wallet]);
            await simulateTxn(vTxn);
            const result = await confirmVtxn(vTxn);

            if (!result) {
              console.log(chalk.red("Transaction failed."));
            } else {
              const { txHash } = result;
              console.log(
                chalk.green(`Transaction confirmed. https://solscan.io/tx/${txHash}`)
              );
            }
            resolve();
          } catch (error) {
            console.log(chalk.red("Error in transfer:", error));
            resolve();
          }
        }
      );
    });
  });
}
