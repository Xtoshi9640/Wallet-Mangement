import { VersionedTransaction } from "@solana/web3.js";
import { SOLANA_RPC_URL, wallet } from "../config/config";
import { tokenClose } from "./tokenClose";
import { SwapParam } from "../utils/types";
import { simulateTxn } from "../utils/utils";
import { pumpfunSwap } from "./pumpfun/pumpfunSwap";
import bs58 from "bs58";

export async function confirmVtxn(txn: VersionedTransaction) {
  const skipSimulate = true;
  const response = await fetch(SOLANA_RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: [
        bs58.encode(txn.serialize()),
        {
          encoding: "base58",
          skipPreflight: skipSimulate,
          preflightCommitment: "confirmed",
          maxRetries: 1,
        },
      ],
    }),
  });
  const data = await response.json();
  if (data.error) {
    console.error(`[ swap ] confirmVtxn error: ${data.error.message}`);
    return null;
  }
  return { txHash: data.result };
}

export const swap = async (swapParam: SwapParam): Promise<string | null> => {
  try {
    let vTxn;
    if (swapParam.isSellAll && swapParam.amount < 1_000_000) {
      vTxn = await tokenClose(swapParam.mint, swapParam.amount);
    } else {
      vTxn = await pumpfunSwap(swapParam);
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
