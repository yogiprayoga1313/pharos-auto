# Pharos Network Tools

> 💝 If you find this tool helpful, you can support me by sending tips to: `0xda6663106f2c33f8d0e43264a476b97e83bb746c`

A Node.js script for automating various tasks on Pharos Network testnet.

## Features

- Token swapping
- Token sending
- Wallet management
- Transaction tracking
- Support for 100+ accounts
- Automatic mode detection (single/multi)
- Parallel processing for multiple accounts

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yogiprayoga1313/pharos-auto.git
cd pharos-auto
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The script uses the following environment variables:
- `RPC_URL`: Pharos Network RPC endpoint

### File Structure

The project uses several JSON files for data storage:

1. `account.json` - Stores your wallet information
   - Create this file manually with your wallet details
   - Format:
   ```json
   [
     {
       "address": "your-wallet-address-1",
       "privateKey": "your-private-key-1"
     },
     {
       "address": "your-wallet-address-2",
       "privateKey": "your-private-key-2"
     }
     // ... can add up to 100+ accounts
   ]
   ```
   - ⚠️ Never commit this file to git
   - Keep this file secure as it contains sensitive information

## Usage

The project contains multiple scripts for different purposes:

1. For token swapping:
```bash
node swap.js
```

2. For sending tokens:
```bash
node index.js
```

Each script will:
1. Read wallet information from `account.json`
2. Automatically detect number of accounts:
   - Single account mode if only 1 wallet
   - Multi account mode if more than 1 wallet
3. Process accounts in parallel (up to 3 concurrent accounts)
4. Save relevant information to appropriate files

## Output

Each file contains:
- Wallet address
- Transaction details
- Timestamp
- Status information

## Security Notice

- Never share your private keys
- Keep all JSON files secure
- Do not commit sensitive information to git
- Make sure to add sensitive files to `.gitignore`

## Performance

- Supports 100+ accounts in `account.json`
- Automatic mode detection based on account count
- Parallel processing for faster execution
- Configurable delays between transactions
- Error handling and retry mechanism
