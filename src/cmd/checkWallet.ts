import { checkSolBalance } from "./checkSOLBalance";
import { checkWalletTokens } from "./checkTokenBalance";

export async function checkWallet() {
    await checkSolBalance();
    await checkWalletTokens();
}