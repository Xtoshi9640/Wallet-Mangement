import { swap } from "./swap";
import { SwapParam } from "../utils/types";
import { getPumpData } from "./pumpfun/utils";
import chalk from "chalk";

export const sellTokenSwap = async (mint: string, amount: number, isSellAll: boolean) => {
    try {
      const _tip = 0.000_001;
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
      if (!txHash) return null;
      console.log(chalk.green(`[ - ] Sold https://solscan.io/tx/${txHash}`));
    } catch (error) {
      console.log(error);
      return null;
    }
  };
  