import { ethers } from 'ethers';

/**
 * ABI for the GuardianOracle contract — only the functions we need from
 * the worker service (no full typechain needed here, keeps deps light).
 */
const ORACLE_ABI = [
    'function updateVerdict(address tokenAddress, bool isValid) external',
    'function updateVerdicts(address[] calldata tokenAddresses, bool[] calldata validities) external',
    'function getVerdict(address tokenAddress) external view returns (bool isValid, uint256 updatedAt, address updatedBy)',
    'function isTokenValid(address tokenAddress) external view returns (bool valid, uint256 updatedAt)',
    'function addOperator(address operator) external',
    'function isOperator(address account) external view returns (bool)',
];

/** Network → JSON-RPC url mapping (matches Guardian's existing Hedera SDK config) */
const RPC_URLS: Record<string, string> = {
    mainnet:    'https://mainnet.hashio.io/api',
    testnet:    'https://testnet.hashio.io/api',
    previewnet: 'https://previewnet.hashio.io/api',
    local:      process.env.HEDERA_LOCAL_RPC_URL || 'http://localhost:7546/api',
};

function getProvider(networkName: string): ethers.JsonRpcProvider {
    const url = RPC_URLS[networkName] ?? RPC_URLS.testnet;
    return new ethers.JsonRpcProvider(url);
}

function getSigner(privateKey: string, networkName: string): ethers.Wallet {
    const provider = getProvider(networkName);
    return new ethers.Wallet(privateKey, provider);
}

function getOracleContract(
    contractAddress: string,
    signerOrProvider: ethers.Wallet | ethers.JsonRpcProvider
): ethers.Contract {
    return new ethers.Contract(contractAddress, ORACLE_ABI, signerOrProvider);
}

// -------------------------------------------------------------------------
// Exported helpers — called by worker-service task handlers
// -------------------------------------------------------------------------

/**
 * Push a single verdict to the on-chain GuardianOracle contract.
 */
export async function oracleUpdateVerdict(params: {
    contractAddress: string;
    tokenAddress: string;
    isValid: boolean;
    operatorKey: string;
    networkName: string;
}): Promise<{ txId: string }> {
    const signer  = getSigner(params.operatorKey, params.networkName);
    const oracle  = getOracleContract(params.contractAddress, signer);
    const tx      = await oracle.updateVerdict(params.tokenAddress, params.isValid);
    const receipt = await tx.wait();
    return { txId: receipt.hash };
}

/**
 * Push multiple verdicts in one batch transaction.
 */
export async function oracleUpdateVerdictsBatch(params: {
    contractAddress: string;
    tokenAddresses: string[];
    validities: boolean[];
    operatorKey: string;
    networkName: string;
}): Promise<{ txId: string }> {
    const signer  = getSigner(params.operatorKey, params.networkName);
    const oracle  = getOracleContract(params.contractAddress, signer);
    const tx      = await oracle.updateVerdicts(params.tokenAddresses, params.validities);
    const receipt = await tx.wait();
    return { txId: receipt.hash };
}

/**
 * Read a verdict via Mirror Node (view call, no gas required).
 */
export async function oracleGetVerdict(params: {
    contractAddress: string;
    tokenAddress: string;
    networkName: string;
}): Promise<{ isValid: boolean; updatedAt: number; updatedBy: string }> {
    const provider = getProvider(params.networkName);
    const oracle   = getOracleContract(params.contractAddress, provider);
    const [isValid, updatedAt, updatedBy] = await oracle.getVerdict(params.tokenAddress);
    return {
        isValid:   Boolean(isValid),
        updatedAt: Number(updatedAt),
        updatedBy: String(updatedBy),
    };
}

/**
 * Register a Guardian backend address as an authorised oracle operator.
 * Called once at startup if the address is not yet an operator.
 */
export async function oracleRegisterOperator(params: {
    contractAddress: string;
    operatorAddress: string;
    ownerKey: string;
    networkName: string;
}): Promise<{ txId: string }> {
    const signer  = getSigner(params.ownerKey, params.networkName);
    const oracle  = getOracleContract(params.contractAddress, signer);
    const already = await oracle.isOperator(params.operatorAddress);
    if (already) {
        return { txId: 'already-operator' };
    }
    const tx      = await oracle.addOperator(params.operatorAddress);
    const receipt = await tx.wait();
    return { txId: receipt.hash };
}
