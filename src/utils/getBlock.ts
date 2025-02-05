import { connection } from "../config/config";

let lastValidBlockhash = "";

// Function to fetch the latest blockhash and cache it
export async function fetchLastValidBlockhash() {
  try {
    const { blockhash } = await connection.getLatestBlockhash();
    lastValidBlockhash = blockhash;
  } catch (error:any) {
    console.log("Error fetching latest blockhash:" + error.message);
  }
}

// Keep fetching the last valid blockhash every 100ms
setInterval(fetchLastValidBlockhash, 300);

export function getLastValidBlockhash(): string {
  return lastValidBlockhash;
}
