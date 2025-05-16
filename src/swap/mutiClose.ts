import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import chalk from "chalk";
import { confirmVtxn } from "./swap";
import { wallet } from "../config/config";
import { JitoAccounts } from "./jito/jito";
import { simulateTxn } from "../utils/utils";
import { getLastValidBlockhash } from "../utils/getBlock";

export const multiClose = async (tokens: string[]) => {
  try {
    if(tokens.length === 0) {
      console.log(chalk.green("[ - ] No associated accounts to close."));
      return true;
    }
    console.log(`[ - ] ${tokens.length} associated accounts are in your wallet.`);
    const instructions: TransactionInstruction[] = [];
    const tip = 0.000_001;
    const feeInstructions = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(JitoAccounts[2]),
      lamports: tip * LAMPORTS_PER_SOL,
    });
    instructions.push(feeInstructions);

    for (const token of tokens) {
      const splAta = getAssociatedTokenAddressSync(
        new PublicKey(token),
        wallet.publicKey,
        true
      );
      instructions.push(
        createCloseAccountInstruction(splAta, wallet.publicKey, wallet.publicKey)
      );
    }
    const blockhash = await getLastValidBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const vTxn = new VersionedTransaction(messageV0);
    if (!vTxn) return null;

    vTxn.sign([wallet]);
    await simulateTxn(vTxn);
     
    const result = await confirmVtxn(vTxn);
    if (!result) return null;
    const { txHash } = result;
    console.log(chalk.green(`[ - ] ata close https://solscan.io/tx/${txHash}`));
    return true;
  } catch (error) {
    console.log("[ Ata ]", error);
    return false;
  }
};
