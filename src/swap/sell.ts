import { swap } from "./swap";
import { SwapParam } from "../utils/types";
import { getPumpData } from "./pumpfun/utils";

export const sellTokenSwap = async (mint: string, amount: number, isSellAll: boolean) => {
    try {
      const _tip = 0.000_01;
      const pumpData = await getPumpData(mint);
      const swapParam: SwapParam = {
        mint: mint,
        amount: amount, // no decimals
        tip: _tip, // no decimals
        slippage: 100, // 0.1 ~ 100
        is_buy: false,
        isSellAll,
      };
      if(pumpData) {
        swapParam.pumpData = pumpData;
      }

      const txHash = await swap(swapParam);
      console.log(`https://solscan.io/tx/${txHash}`);
    } catch (error) {
      console.log(error);
      return null;
    }
  };
  