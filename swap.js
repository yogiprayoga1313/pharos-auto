import { createWalletClient, createPublicClient, http, parseEther, formatEther, custom } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Custom chain config untuk Pharos Testnet
const pharosTestnet = {
  id: 688688,
  name: 'Pharos Testnet',
  nativeCurrency: {
    name: 'PHRS',
    symbol: 'PHRS',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://api.zan.top/node/v1/pharos/testnet/1761472bf26745488907477d23719fb5'],
    },
  },
};

// Configuration
const CONFIG = {
    mode: 'multi', // Changed from 'single' to 'multi'
    selectedAccount: 0,
    maxConcurrent: 2, // Set to 2 since we have 2 accounts
    delayBetweenAccounts: 10000,
    amountPerSwap: '0.002',
    numberOfSwaps: 20,
    minDelay: 5000,
    maxDelay: 15000
};

// Load private key dari file account.json
const accounts = JSON.parse(fs.readFileSync('./account.json', 'utf8'));

// Setup client Viem
const RPC_URL = process.env.RPC_URL || 'https://api.zan.top/node/v1/pharos/testnet/1761472bf26745488907477d23719fb5';

// Alamat dan ABI WPHRS
const WPHRS_ADDRESS = '0x76aaada469d23216be5f7c596fa25f282ff9b364';
const WPHRS_ABI = [
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "wad", "type": "uint256" }],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Fungsi untuk delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to get random delay
function getRandomDelay() {
    return Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
}

async function getBalance(publicClient, address) {
  try {
    const nativeBalance = await publicClient.getBalance({ address });
    const wrappedBalance = await publicClient.readContract({
      address: WPHRS_ADDRESS,
      abi: WPHRS_ABI,
      functionName: 'balanceOf',
      args: [address],
    });

    console.log(`\nBalances for ${address}:`);
    console.log('Wrapped PHRS (WPHRS) balance:', formatEther(wrappedBalance));
    console.log('Native PHRS balance:', formatEther(nativeBalance));
    return { nativeBalance, wrappedBalance };
  } catch (error) {
    console.error('Error getting balance:', error.message);
    return { nativeBalance: 0n, wrappedBalance: 0n };
  }
}

async function wrapPHRS(walletClient, publicClient, amountEth = '0.0001') {
  const amount = parseEther(amountEth);

  try {
    // Get current gas price and add 20% buffer
    const baseGasPrice = await publicClient.getGasPrice();
    const gasPrice = baseGasPrice * 12n / 10n; // Add 20% buffer
    console.log('Base gas price:', formatEther(baseGasPrice), 'PHRS');
    console.log('Adjusted gas price:', formatEther(gasPrice), 'PHRS');

    // Prepare transaction
    const tx = {
      to: WPHRS_ADDRESS,
      value: amount,
      data: '0xd0e30db0', // deposit() function selector
      gasPrice: gasPrice,
      gas: 300000n, // Increased gas limit
    };

    console.log('Transaction parameters:', {
      to: tx.to,
      value: formatEther(tx.value),
      gasPrice: formatEther(tx.gasPrice),
      gas: tx.gas.toString()
    });

    // Send transaction
    const txHash = await walletClient.sendTransaction(tx);
    console.log('Transaction sent! Hash:', txHash);
    
    // Wait for transaction confirmation
    console.log('Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    
    if (receipt.status === 'success' || receipt.status === 1n) {
      console.log('Transaction successful!');
      console.log('Gas used:', receipt.gasUsed.toString());
      console.log('Effective gas price:', formatEther(receipt.effectiveGasPrice), 'PHRS');
      return true;
    } else {
      console.error('Transaction failed!');
      console.error('Receipt:', receipt);
      return false;
    }
  } catch (err) {
    console.error('Wrap failed:', err.message || err);
    if (err.details) {
      console.error('Error details:', err.details);
    }
    return false;
  }
}

async function unwrapPHRS(walletClient, publicClient) {
  try {
    // Get WPHRS balance
    const { wrappedBalance } = await getBalance(publicClient, walletClient.account.address);
    if (wrappedBalance === 0n) {
      console.log('No WPHRS to unwrap');
      return false;
    }

    console.log(`\nUnwrapping ${formatEther(wrappedBalance)} WPHRS to PHRS...`);

    // Get current gas price and add 20% buffer
    const baseGasPrice = await publicClient.getGasPrice();
    const gasPrice = baseGasPrice * 12n / 10n; // Add 20% buffer
    console.log('Base gas price:', formatEther(baseGasPrice), 'PHRS');
    console.log('Adjusted gas price:', formatEther(gasPrice), 'PHRS');

    // Prepare transaction
    const tx = {
      to: WPHRS_ADDRESS,
      data: '0x2e1a7d4d' + wrappedBalance.toString(16).padStart(64, '0'), // withdraw(uint256) function selector + amount
      gasPrice: gasPrice,
      gas: 300000n, // Increased gas limit
    };

    console.log('Transaction parameters:', {
      to: tx.to,
      value: '0',
      gasPrice: formatEther(tx.gasPrice),
      gas: tx.gas.toString()
    });

    // Send transaction
    const txHash = await walletClient.sendTransaction(tx);
    console.log('Transaction sent! Hash:', txHash);
    
    // Wait for transaction confirmation
    console.log('Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    
    if (receipt.status === 'success' || receipt.status === 1n) {
      console.log('Unwrap successful!');
      console.log('Gas used:', receipt.gasUsed.toString());
      console.log('Effective gas price:', formatEther(receipt.effectiveGasPrice), 'PHRS');
      return true;
    } else {
      console.error('Unwrap failed!');
      console.error('Receipt:', receipt);
      return false;
    }
  } catch (err) {
    console.error('Unwrap failed:', err.message || err);
    if (err.details) {
      console.error('Error details:', err.details);
    }
    return false;
  }
}

async function processWallet(account) {
  try {
    console.log(`\n=== Processing wallet: ${account.address} ===`);
    
    // Setup clients for this wallet
    const walletClient = createWalletClient({
      account: privateKeyToAccount(account.privateKey.startsWith('0x') ? account.privateKey : '0x' + account.privateKey),
      chain: pharosTestnet,
      transport: http(RPC_URL),
    });

    const publicClient = createPublicClient({
      chain: pharosTestnet,
      transport: http(RPC_URL),
    });

    // Check initial balances
    console.log('\nChecking initial balances...');
    await getBalance(publicClient, account.address);

    // Perform wraps
    let successfulWraps = 0;
    for (let i = 0; i < CONFIG.numberOfSwaps; i++) {
      console.log(`\nWrap ${i + 1}/${CONFIG.numberOfSwaps}`);
      const success = await wrapPHRS(walletClient, publicClient, CONFIG.amountPerSwap);
      
      if (success) {
        successfulWraps++;
        console.log(`Successfully completed ${successfulWraps} out of ${CONFIG.numberOfSwaps} wraps`);
      }

      // Add random delay between wraps
      if (i < CONFIG.numberOfSwaps - 1) {
        const delay = getRandomDelay();
        console.log(`Waiting ${delay/1000} seconds before next wrap...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Wait 5 seconds before unwrapping
    console.log('\nWaiting 5 seconds before unwrapping...');
    await delay(5000);

    // Unwrap all WPHRS
    console.log('\nStarting unwrap process...');
    const unwrapSuccess = await unwrapPHRS(walletClient, publicClient);

    if (unwrapSuccess) {
      console.log('\nUnwrap completed successfully!');
    } else {
      console.log('\nUnwrap failed!');
    }

    // Check final balances
    console.log('\nChecking final balances...');
    await getBalance(publicClient, account.address);

    return { success: true, address: account.address };
  } catch (error) {
    console.error(`Failed to process wallet ${account.address}:`, error.message);
    return { success: false, address: account.address, error: error.message };
  }
}

async function processSingleAccount() {
  console.log('\n=== Running in Single Account Mode ===');
  if (CONFIG.selectedAccount >= accounts.length) {
    throw new Error(`Selected account index ${CONFIG.selectedAccount} is out of range`);
  }
  const account = accounts[CONFIG.selectedAccount];
  return await processWallet(account);
}

async function processMultiAccount() {
  console.log('\n=== Running in Multi Account Mode ===');
  const results = [];
  const activeAccounts = new Set();

  for (let i = 0; i < accounts.length; i++) {
    // Wait if we've reached max concurrent accounts
    while (activeAccounts.size >= CONFIG.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const account = accounts[i];
    activeAccounts.add(account.address);
    
    // Process account in parallel
    processWallet(account).then(result => {
      activeAccounts.delete(account.address);
      results.push(result);
    });

    // Add delay between starting new accounts
    if (i < accounts.length - 1) {
      console.log(`Waiting ${CONFIG.delayBetweenAccounts/1000} seconds before starting next account...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenAccounts));
    }
  }

  // Wait for all accounts to finish
  while (activeAccounts.size > 0) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

async function main() {
  console.log('Starting PHRS wrap bot...');
  console.log(`Will perform ${CONFIG.numberOfSwaps} wraps of ${CONFIG.amountPerSwap} PHRS each`);
  console.log(`Delay between wraps: ${CONFIG.minDelay/1000}-${CONFIG.maxDelay/1000} seconds`);
  
  try {
    let results;
    if (CONFIG.mode === 'single') {
      results = await processSingleAccount();
    } else {
      results = await processMultiAccount();
    }
    
    console.log('\n=== Processing complete! ===');
    console.log('Results:', results);
    process.exit(0); // Exit after completion
  } catch (error) {
    console.error('Main process failed:', error.message);
    process.exit(1); // Exit with error code
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
