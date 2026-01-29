# Guardian Smart Contracts

[![Solidity](https://img.shields.io/badge/solidity-0.8.28-brightgreen.svg)](https://docs.soliditylang.org/en/v0.8.28/)
[![Hardhat](https://img.shields.io/badge/hardhat-2.28.2-orange.svg)](https://hardhat.org/)
[![Foundry](https://img.shields.io/badge/foundry-toolkit-red.svg)](https://book.getfoundry.sh/)
[![Hedera](https://img.shields.io/badge/hedera-HCS%20%2F%20HTS-blue.svg)](https://hedera.com/)

## Overview

This directory contains the smart contracts for the Guardian project, implementing key functionalities such as Token Wipe and Retirement operations on the Hedera network. The development environment supports both Hardhat and Foundry toolchains, integrated with Hedera's EVM-compatible JSON-RPC Relay.

Key contracts:
- **Wipe**: Handles token wipe requests and management.
- **Retire**: Implements token retirement (offsetting) logic, including Single and Double token pools.
- **SafeHTS**: A library for safe interaction with Hedera Token Service (HTS) precompiles.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [NPM](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (optional, for advanced tooling)
- [Hedera Local Node](https://github.com/hashgraph/hedera-local-node) (for local development)
- [Hedera JSON-RPC Relay](https://github.com/hashgraph/hedera-json-rpc-relay)

## Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```dotenv
RPC_URL=http://127.0.0.1:7546
PRIVATE_KEY=0x...
OPERATOR_ID=0.0.2
OPERATOR_KEY=302e...
HEDERA_NETWORK=local
```

For different networks:
- **Local**: `RPC_URL=http://127.0.0.1:7546`, `HEDERA_NETWORK=local`
- **Testnet**: `RPC_URL=https://testnet.hashio.io/api`, `HEDERA_NETWORK=testnet`
- **Mainnet**: `RPC_URL=https://mainnet.hashio.io/api`, `HEDERA_NETWORK=mainnet`
- **Previewnet**: `RPC_URL=https://previewnet.hashio.io/api`, `HEDERA_NETWORK=previewnet`

## Installation

Install dependencies from the `contracts` directory:

```bash
npm install
```

## Development

### Compilation

Compile the smart contracts using Hardhat:

```bash
npm run compile
```

### Cleanup

Remove compilation artifacts and cache:

```bash
npm run clean
```

## Foundry Integration

This project integrates [Foundry](https://book.getfoundry.sh/) as an alternative toolkit alongside Hardhat, providing fast compilation and advanced Solidity tooling.

### Installing Foundry

If you haven't installed Foundry yet, install it using:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:

```bash
forge --version
```

### Using Foundry

All contracts are located in the `src/` directory and can be compiled with Foundry:

**Compile contracts:**
```bash
npm run forge:build
# or directly
forge build
```

**Clean build artifacts:**
```bash
npm run forge:clean
# or directly
forge clean
```

**Format Solidity code:**
```bash
npm run forge:fmt
# or directly
forge fmt
```

### Configuration

Foundry configuration is defined in `foundry.toml`:
- Solidity version: `0.8.28`
- EVM version: `cancun`
- Optimizer: enabled with 200 runs (matches Hardhat settings)
- Artifacts output: `out/`
- Cache: `cache-foundry/`

## Testing

The test suite combines Hardhat's testing environment with the Hedera SDK to provide comprehensive end-to-end verification of contract behavior on the Hedera network.

To run all tests:

```bash
npm test
```

Tests are located in the `./tests` directory and cover:
- Contract deployment and initialization.
- Access control and management.
- Fungible and Non-Fungible token operations (Mint, Burn, Wipe, Transfer).
- Complex retirement workflows.

## Deployment

You can deploy contracts to any Hedera network configured in `hardhat.config.ts`.

### Deploy to Local Network

Ensure your local Hedera node and JSON-RPC Relay are running, then:

```bash
npx hardhat run scripts/deploy.ts --network hedera
```

### Deploy to Testnet

Update your `.env` with Testnet RPC URL and credentials, then:

```bash
npx hardhat run scripts/deploy.ts --network hedera
```

## Owner Management

The smart contracts use a two-step ownership transfer pattern for security. This allows safe transfer of ownership without the risk of losing access to the contract.


### Guardian CLI Commands

Use the Guardian CLI to manage contract ownership:

#### Propose New Owner

Propose a new owner for the contract. The new owner must call `claim-owner` to complete the transfer.

```bash
guardian-cli propose-owner <contract-id> <new-owner-address> <account> <key> [options]
```

**Arguments:**
- `<contract-id>` - Contract identifier (e.g., `0.0.12345`)
- `<new-owner-address>` - New owner's Hedera account ID (e.g., `0.0.67890`) or EVM address
- `<account>` - Your Hedera account ID
- `<key>` - Your Hedera private key

**Options:**
- `-g, --gas <gas>` - Gas limit (default: 2000000)
- `-n, --network <network>` - Network: `mainnet`, `testnet`, `previewnet` (default: `testnet`)

**Example:**
```bash
guardian-cli propose-owner 0.0.12345 0.0.67890 0.0.11111 302e020100300506032b657004220420... -n testnet
```

#### Claim Ownership

Claim ownership of a contract after being proposed as the new owner.

```bash
guardian-cli claim-owner <contract-id> <account> <key> [options]
```

**Arguments:**
- `<contract-id>` - Contract identifier
- `<account>` - Your Hedera account ID (must be the pending owner)
- `<key>` - Your Hedera private key

**Options:**
- `-g, --gas <gas>` - Gas limit (default: 2000000)
- `-n, --network <network>` - Network: `mainnet`, `testnet`, `previewnet` (default: `testnet`)

**Example:**
```bash
guardian-cli claim-owner 0.0.12345 0.0.67890 302e020100300506032b657004220420... -n testnet
```

#### Remove Owner

Remove an existing owner from the contract. Cannot remove yourself or the contract address.

```bash
guardian-cli remove-owner <contract-id> <owner-address> <account> <key> [options]
```

**Arguments:**
- `<contract-id>` - Contract identifier
- `<owner-address>` - Owner's Hedera account ID or EVM address to remove
- `<account>` - Your Hedera account ID
- `<key>` - Your Hedera private key

**Options:**
- `-g, --gas <gas>` - Gas limit (default: 2000000)
- `-n, --network <network>` - Network: `mainnet`, `testnet`, `previewnet` (default: `testnet`)

**Example:**
```bash
guardian-cli remove-owner 0.0.12345 0.0.99999 0.0.11111 302e020100300506032b657004220420... -n testnet
```

### Ownership Transfer Workflow

1. **Current owner proposes new owner:**
   ```bash
   guardian-cli propose-owner 0.0.12345 0.0.67890 0.0.11111 <current-owner-key>
   ```

2. **New owner claims ownership:**
   ```bash
   guardian-cli claim-owner 0.0.12345 0.0.67890 <new-owner-key>
   ```

3. **(Optional) Remove old owner:**
   ```bash
   guardian-cli remove-owner 0.0.12345 0.0.11111 0.0.67890 <new-owner-key>
   ```

---
([back to top](#guardian-smart-contracts))
