import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.28',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },

    defaultNetwork: 'hardhat',

    networks: {
        local: {
            chainId: 298,
            url: RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
        },
        testnet: {
            chainId: 296,
            url: RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            timeout: 200000,
            allowUnlimitedContractSize: true,
        },
        previewnet: {
            chainId: 297,
            url: RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
        },
        mainnet: {
            chainId: 295,
            url: RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
        },
        hardhat: {
            blockGasLimit: 9999999999999,
            gas: 30000000,
            allowUnlimitedContractSize: true,
        },
    },

    paths: {
        sources: './src',
        tests: './tests',
        artifacts: './artifacts',
        cache: './cache',
    },

    mocha: {
        timeout: 100000,
    },
};

export default config;
