import { VersionedTransaction } from "@solana/web3.js";
import { connection, wallet } from "../config/config";
import { tokenClose } from "./tokenClose";
import { SwapParam } from "../utils/types";
import { simulateTxn } from "../utils/utils";
import { JitoBundleService } from "./jito/jito";
import { raydiumSwap } from "./raydium/raydiumSwap";
import { pumpfunSwap } from "./pumpfun/pumpfunSwap";

export async function confirmVtxn(txn: VersionedTransaction) {
  const rawTxn = txn.serialize();
  const jitoBundleInstance = new JitoBundleService();
  const txHash = await jitoBundleInstance.sendTransaction(rawTxn);
  const txRlt = await connection.confirmTransaction(txHash);
  if (txRlt.value.err) return null;
  return { txHash };
}

export const swap = async (swapParam: SwapParam): Promise<string | null> => {
  try {
    let vTxn;
    if (swapParam.isSellAll && swapParam.amount < 1_000_000) {
      vTxn = await tokenClose(swapParam.mint, swapParam.amount);
    } else {
      vTxn = await pumpfunSwap(swapParam);
      if (!vTxn) {
        vTxn = await raydiumSwap(swapParam);
      }
    }
    if (!vTxn) return null;
    vTxn.sign([wallet]);
    await simulateTxn(vTxn);
    const result = await confirmVtxn(vTxn);
    if (!result) return null;
    const { txHash } = result;
    return txHash;
  } catch (e: any) {
    console.error("- Error while running swap function", e.message);
    return null;
  }
};
