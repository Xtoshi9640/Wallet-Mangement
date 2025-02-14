import * as readline from 'readline';
import { checkSolBalance } from './cmd/checkSOLBalance';
import { checkWalletTokens } from './cmd/checkTokenBalance';
import { tokenSellAllAndClose } from './cmd/sellAllandClose';
import chalk from 'chalk';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function displayMenu() {    
  console.log("1. Check SOL balance");
  console.log("2. Check wallet tokens");
  console.log("3. Sell all and close tokens");
  console.log("4. Exit");
}


async function handleUserInput() {
  displayMenu();
  
  rl.question('Enter your choice (1-4): ', async (choice) => {
    try {
      switch (choice) {
        case '1':
          await checkSolBalance();
          break;
        case '2':
          await checkWalletTokens();
          break;
        case '3':
          console.log(chalk.yellow("Starting sell all and close process..."));
          await tokenSellAllAndClose();
          break;
        case '4':
          console.log(chalk.green("Goodbye!\n2/5/2025, v1.0.0, by @plzbugmenot"));
          rl.close();
          return;
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
  console.log(chalk.blue(`
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║              Welcome to Solana Token Manager                 ║
    ║                                                              ║
    ║           Manage your Solana tokens efficiently              ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    `));
  handleUserInput();
}

main();
