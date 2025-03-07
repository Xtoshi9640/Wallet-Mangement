import { connection } from "../config/config";

export async function getLastValidBlockhash(): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash();
  return blockhash;
}
