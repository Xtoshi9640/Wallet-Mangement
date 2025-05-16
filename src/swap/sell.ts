import chalk from "chalk";
import { swap } from "./swap";
import { SwapParam } from "../utils/types";
import { getPumpData } from "./pumpfun/utils";

export const sellTokenSwap = async (mint: string, amount: number, isSellAll: boolean) => {
    try {
      const pumpData = await getPumpData(mint);
      if(!pumpData) {
        console.log(chalk.red(`[ - ] No pump data found for ${mint}`));
        return null;
      }
      const swapParam: SwapParam = {
        mint,
        dev: pumpData.dev,
        amount, // no decimals
        slippage: 100, // 0.1 ~ 100
        is_buy: false,
        isSellAll,
        pumpData
      };

      const txHash = await swap(swapParam);
      if (!txHash) return null;
      console.log(chalk.green(`[ - ] Sold https://solscan.io/tx/${txHash}`));
    } catch (error) {
      console.log(error);
      return null;
    }
  };
  