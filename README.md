# Pharos Network Tools

> 💝 If you find this tool helpful, you can support me by sending tips to: `0xda6663106f2c33f8d0e43264a476b97e83bb746c`

A Node.js script for automating various tasks on Pharos Network testnet.

## Features

- Token swapping
- Token sending
- Wallet management
- Transaction tracking

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

1. `account.json` - Stores your main wallet information
   - Create this file manually with your wallet details
   - Format:
   ```json
   {
     "address": "your-wallet-address",
     "privateKey": "your-private-key"
   }
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
2. Perform its specific task
3. Save relevant information to appropriate files

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
