import chalk from 'chalk';
import * as readline from 'readline';
import { wallet } from './config/config';
import { checkWallet } from './cmd/checkWallet';
import { tokenSellAllAndClose } from './cmd/sellAllandClose';
import { solTransfer } from './cmd/solTransfer';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function displayMenu() {
  console.log(`
    1. Check Wallet balance
    2. SOL Transfer
    3. Sell all Tokens and close Token Account
    4. Exit
    `)
}


async function handleUserInput() {
  displayMenu();
  
  rl.question('             Enter your choice (1-4): ', async (choice) => {
    try {
      switch (choice) {
        case '1':
          await checkWallet();
          break;
        case '2':
          await solTransfer(rl);
          break;
        case '3':
          console.log(chalk.yellow("Starting sell all and close process..."));
          await tokenSellAllAndClose();
          break;
        case '4':
          console.log(chalk.green("Goodbye!\n2/5/2025, v1.0.0, by @plzbugmenot"));
          rl.close();
          process.exit(0);
        default:
          console.log(chalk.red("Invalid choice"));
      }
    } catch (error) {
      console.log(chalk.red("Error occurred:", error));
    }
    
    handleUserInput(); // Continue with next command
  });
}

async function main() {
  console.log(chalk.green(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              Welcome to Solana Token Manager                 ║
║                                                              ║
║           Manage your Solana tokens efficiently              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `));
  const walletAddress = wallet.publicKey.toBase58();
  console.log(chalk.green(`Wallet Address: ${walletAddress}`));
  handleUserInput();
}

main();
