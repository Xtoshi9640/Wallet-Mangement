import { VersionedTransaction } from "@solana/web3.js";
import { connection, wallet } from "../config/config";
import { JitoBundleService } from "./jito/jito";
import { tokenClose } from "./tokenClose";
import { simulateTxn } from "../utils/utils";
import { SwapParam } from "../utils/types";
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
    console.log("- swap 1");
    if (swapParam.isSellAll && swapParam.amount < 1000_000) {
      console.log("- swap 2");

      vTxn = await tokenClose(swapParam.mint, swapParam.amount);
    } else {
      console.log("- swap 3");

      vTxn = await raydiumSwap(swapParam);
      if (!vTxn) {
        console.log("- swap 4");

        vTxn = await pumpfunSwap(swapParam);
      }
    }
    console.log("- swap 5");

    if (!vTxn) return null;
    console.log("- swap 6");

    vTxn.sign([wallet]);
    console.log("- swap 7");

    await simulateTxn(vTxn);
    console.log("- swap 8");

    const result = await confirmVtxn(vTxn);
    if (!result) return null;
    console.log("- swap 9");

    const { txHash } = result;
    return txHash;
  } catch (e: any) {
    console.error("- Error while running swap function", e.message);
    return null;
  }
};
