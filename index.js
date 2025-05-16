import axios from 'axios';
import { ethers } from 'ethers';
import fs from 'fs';

// Constants
const API_BASE_URL = 'https://api.pharosnetwork.xyz';
const REFERRAL_CODE = 'ajn8JN0egTiHHa9Z';
const REFERRAL_URL = `https://testnet.pharosnetwork.xyz/experience?inviteCode=${REFERRAL_CODE}`;
const RPC_URL = 'https://testnet.dplabs-internal.com';
const TASK_ID = 103; // Task ID for sending PHRS
const AMOUNT_TO_SEND = '0.0001'; // Amount of PHRS to send
const NUMBER_OF_TRANSACTIONS = 91;

// Delay settings (in milliseconds)
const MIN_DELAY = 5000;  // Minimum 5 seconds
const MAX_DELAY = 15000; // Maximum 15 seconds

// Configuration
const CONFIG = {
    mode: 'single', // 'single' or 'multi'
    selectedAccount: 0, // Index of account to use in single mode
    maxConcurrent: 3, // Maximum number of concurrent accounts in multi mode
    delayBetweenAccounts: 10000 // Delay between starting new accounts in multi mode
};

// Read wallet credentials
const accounts = JSON.parse(fs.readFileSync('./account.json', 'utf8'));

// Provider setup
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Function to get random delay
function getRandomDelay() {
    return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
}

async function signMessage(wallet, message) {
    const signature = await wallet.signMessage(message);
    return signature;
}

async function loginWallet(address, signature) {
    try {
        const response = await axios.post(`${API_BASE_URL}/user/login`, null, {
            params: {
                address: address,
                signature: signature
            },
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'origin': 'https://testnet.pharosnetwork.xyz',
                'referer': 'https://testnet.pharosnetwork.xyz/'
            }
        });
        return response.data.data.jwt;
    } catch (error) {
        console.error('Login failed:', error.message);
        throw error;
    }
}

async function verifyTask(address, txHash, jwt) {
    try {
        const response = await axios.post(`${API_BASE_URL}/task/verify`, null, {
            params: {
                address: address,
                task_id: TASK_ID,
                tx_hash: txHash
            },
            headers: {
                'authorization': `Bearer ${jwt}`,
                'accept': 'application/json',
                'origin': 'https://testnet.pharosnetwork.xyz',
                'referer': 'https://testnet.pharosnetwork.xyz/'
            }
        });
        
        // Log detailed response
        console.log('Verification Response:', {
            code: response.data.code,
            message: response.data.msg,
            data: response.data.data
        });

        // Check if points were actually added
        if (response.data.code === 0 && response.data.data.verified) {
            console.log('Task verified successfully');
            return response.data;
        } else {
            console.log('Task verification response indicates no points added');
            throw new Error('Task verification did not add points');
        }
    } catch (error) {
        console.error('Task verification failed:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        throw error;
    }
}

async function getUserProfile(address, jwt) {
    try {
        const response = await axios.get(`${API_BASE_URL}/user/profile`, {
            params: { address },
            headers: {
                'authorization': `Bearer ${jwt}`,
                'accept': 'application/json',
                'origin': 'https://testnet.pharosnetwork.xyz',
                'referer': 'https://testnet.pharosnetwork.xyz/'
            }
        });
        
        // Log detailed profile data
        console.log('Profile Data:', {
            totalPoints: response.data.data.user_info.TotalPoints,
            taskPoints: response.data.data.user_info.TaskPoints,
            referralPoints: response.data.data.user_info.ReferralPoints
        });
        
        return response.data;
    } catch (error) {
        console.error('Profile fetch failed:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        throw error;
    }
}

async function generateRandomAddress() {
    const wallet = ethers.Wallet.createRandom();
    return wallet.address;
}

async function sendTransaction(wallet, toAddress) {
    try {
        // Get current nonce
        const nonce = await provider.getTransactionCount(wallet.address);
        console.log('Current nonce:', nonce);

        const tx = {
            to: toAddress,
            value: ethers.parseEther(AMOUNT_TO_SEND),
            gasLimit: 31500,
            nonce: nonce
        };
        
        const transaction = await wallet.sendTransaction(tx);
        console.log(`Transaction sent: ${transaction.hash}`);
        
        // Wait for transaction confirmation
        console.log('Waiting for confirmation...');
        const receipt = await transaction.wait();
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        
        return transaction;
    } catch (error) {
        if (error.code === 'TRANSACTION_REPLACED') {
            console.log('Transaction was replaced, using replacement transaction...');
            return error.replacement;
        }
        console.error('Transaction failed:', error.message);
        throw error;
    }
}

async function processWallet(account) {
    try {
        console.log(`\n=== Processing wallet: ${account.address} ===`);
        
        // Create wallet instance
        const wallet = new ethers.Wallet(account.privateKey, provider);
        
        // Sign message for login
        const message = "pharos";
        const signature = await signMessage(wallet, message);
        console.log('Generated signature:', signature);
        
        // Login
        const jwt = await loginWallet(account.address, signature);
        console.log('Login successful');

        // Get initial profile
        const initialProfile = await getUserProfile(account.address, jwt);
        console.log('Initial points:', initialProfile.data.user_info.TotalPoints);

        // Send transactions and verify tasks
        for (let i = 0; i < NUMBER_OF_TRANSACTIONS; i++) {
            try {
                console.log(`\nProcessing transaction ${i + 1}/${NUMBER_OF_TRANSACTIONS}`);
                
                // Generate random address
                const randomAddress = await generateRandomAddress();
                console.log(`Sending to random address: ${randomAddress}`);
                
                // Send transaction
                const tx = await sendTransaction(wallet, randomAddress);
                
                // Verify task
                const verifyResult = await verifyTask(account.address, tx.hash, jwt);
                
                // Get updated profile
                const profile = await getUserProfile(account.address, jwt);
                const newPoints = profile.data.user_info.TotalPoints;
                console.log('Points after transaction:', newPoints);
                
                // Add random delay between transactions
                const delay = getRandomDelay();
                console.log(`Waiting ${delay/1000} seconds before next transaction...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
            } catch (error) {
                console.error(`Failed to process transaction ${i + 1}:`, error.message);
                // Add delay even if transaction fails
                const delay = getRandomDelay();
                console.log(`Waiting ${delay/1000} seconds before retrying...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
        }
        
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
    console.log('Starting Pharos bot...');
    console.log(`Using referral code: ${REFERRAL_CODE}`);
    console.log(`Will send ${NUMBER_OF_TRANSACTIONS} transactions of ${AMOUNT_TO_SEND} PHRS each`);
    console.log(`Delay between transactions: ${MIN_DELAY/1000}-${MAX_DELAY/1000} seconds`);
    
    try {
        let results;
        if (CONFIG.mode === 'single') {
            results = await processSingleAccount();
        } else {
            results = await processMultiAccount();
        }
        
        console.log('\n=== Processing complete! ===');
        console.log('Results:', results);
    } catch (error) {
        console.error('Main process failed:', error.message);
    }
}

main().catch(console.error); 