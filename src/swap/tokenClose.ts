// Co authorized by William
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createBurnCheckedInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { metaplex, wallet } from "../config/config";
import { getLastValidBlockhash } from "../utils/getBlock";

export const tokenClose = async (
  mint: string,
  amount: number
): Promise<VersionedTransaction | null> => {
  if (!mint) return null;
  // console.log("tokenclose function called", amount);
  let instructions: TransactionInstruction[] = [];

  const splAta = getAssociatedTokenAddressSync(
    new PublicKey(mint),
    wallet.publicKey,
    true
  );
  const metaData = await metaplex
  .nfts()
  .findByMint({ mintAddress: new PublicKey(mint) });
  const decimals = metaData.mint.decimals || 6;
  if (amount > 0) {
    // console.log("amount is larger than 0", amount);
    instructions.push(
      createBurnCheckedInstruction( // token burn instruction
        splAta,
        new PublicKey(mint),
        wallet.publicKey,
        amount, // with lamport
        decimals
      )
    );
  }
  instructions.push(
    createCloseAccountInstruction( // token close instruction
      splAta,
      wallet.publicKey,
      wallet.publicKey
    )
  )
  const blockhash = await getLastValidBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  const vTxn = new VersionedTransaction(messageV0);
  return vTxn;
};
