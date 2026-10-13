import {AccountCreateTransaction, AccountId, Client, ContractCreateFlow, ContractExecuteTransaction, ContractFunctionParameters, ContractId, Hbar, MirrorNodeTokenBalanceQuery, PrivateKey, TokenCreateTransaction, TokenMintTransaction, TokenSupplyType, TokenType, TransactionRecordQuery, TransferTransaction} from '@hiero-ledger/sdk';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {ethers} from 'ethers';

dotenv.config();

export function getClient(): Client {
    const operatorIdStr = process.env.OPERATOR_ID;
    const operatorKeyStr = process.env.OPERATOR_KEY;
    const network = process.env.HEDERA_NETWORK;

    if (!operatorIdStr || !operatorKeyStr) {
        throw new Error('OPERATOR_ID and OPERATOR_KEY must be set in .env');
    }

    let client: Client;
    if (!network || network === 'local') {
        client = Client.forLocalNode();
    } else if (network === 'testnet' || network === 'mainnet') {
        client = Client.forName(network);
    } else {
        try {
            const networkObj = JSON.parse(network);
            client = Client.forNetwork(networkObj);
            // forNetwork() configures no mirror node, which the balance queries need
            const mirrorNetwork = process.env.MIRROR_NETWORK;
            if (mirrorNetwork) {
                client.setMirrorNetwork(mirrorNetwork.split(',').map(address => address.trim()));
            }
        } catch (e) {
            throw new Error(`Invalid HEDERA_NETWORK value: ${network}. Use "local", "testnet", "mainnet", or a valid JSON object.`);
        }
    }

    const operatorId = AccountId.fromString(operatorIdStr);
    const operatorKey = PrivateKey.fromStringDer(operatorKeyStr);

    client.setOperator(operatorId, operatorKey);
    client.setDefaultMaxTransactionFee(new Hbar(100));
    client.setMaxQueryPayment(new Hbar(50));

    return client;
}

function getBytecode(contractName: string): string {
    let artifactPath: string;

    if (contractName === 'Wipe') {
        artifactPath = path.join(process.cwd(), 'artifacts', 'src', 'wipe', 'Wipe.sol', 'Wipe.json');
    } else if (contractName === 'RetireSingleToken') {
        artifactPath = path.join(process.cwd(), 'artifacts', 'src', 'retire', 'retire-single-token', 'RetireSingleToken.sol', 'RetireSingleToken.json');
    } else if (contractName === 'RetireDoubleToken') {
        artifactPath = path.join(process.cwd(), 'artifacts', 'src', 'retire', 'retire-double-token', 'RetireDoubleToken.sol', 'RetireDoubleToken.json');
    } else {
        throw new Error(`Unknown contract: ${contractName}`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return artifact.bytecode;
}

export async function deployContract(
    client: Client,
    contractName: string,
    gas: number = 4000000
): Promise<{ contractId: string; address: string }> {
    const bytecode = getBytecode(contractName);

    const contractCreateFlow = new ContractCreateFlow()
        .setBytecode(bytecode)
        .setGas(gas);

    const txResponse = await contractCreateFlow.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const contractId = receipt.contractId!.toString();
    const solidityAddress = contractId.split('.')[2];
    const hexAddress = parseInt(solidityAddress, 10).toString(16);
    const paddedAddress = hexAddress.padStart(40, '0');
    const address = `0x${paddedAddress}`;

    return {contractId, address};
}

export async function createFungibleToken(
    client: Client,
    name: string,
    symbol: string,
    wipeKey?: PrivateKey | string
): Promise<{ tokenId: string; address: string }> {
    const operatorKey = client.operatorPublicKey!;

    let tx = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setDecimals(8)
        .setInitialSupply(1000000000)
        .setTreasuryAccountId(client.operatorAccountId!)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        .setSupplyKey(operatorKey);

    if (wipeKey) {
        if (typeof wipeKey === 'string') {
            tx = tx.setWipeKey(ContractId.fromString(wipeKey));
        } else {
            tx = tx.setWipeKey(wipeKey);
        }
    }

    const txResponse = await tx.freezeWith(client).execute(client);
    const receipt = await txResponse.getReceipt(client);
    const tokenId = receipt.tokenId!.toString();
    const solidityAddress = tokenId.split('.')[2];
    const hexAddress = parseInt(solidityAddress, 10).toString(16);
    const paddedAddress = hexAddress.padStart(40, '0');
    const address = `0x${paddedAddress}`;

    return {tokenId, address};
}

export async function createNFT(
    client: Client,
    name: string,
    symbol: string,
    wipeKey?: PrivateKey | string,
    maxSupply: number = 250
): Promise<{ tokenId: string; address: string }> {
    const operatorKey = client.operatorPublicKey!;

    let tx = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(maxSupply)
        .setTreasuryAccountId(client.operatorAccountId!)
        .setSupplyKey(operatorKey);

    if (wipeKey) {
        if (typeof wipeKey === 'string') {
            tx = tx.setWipeKey(ContractId.fromString(wipeKey));
        } else {
            tx = tx.setWipeKey(wipeKey);
        }
    }

    const txResponse = await tx.freezeWith(client).execute(client);
    const receipt = await txResponse.getReceipt(client);
    const tokenId = receipt.tokenId!.toString();
    const solidityAddress = tokenId.split('.')[2];
    const hexAddress = parseInt(solidityAddress, 10).toString(16);
    const paddedAddress = hexAddress.padStart(40, '0');
    const address = `0x${paddedAddress}`;

    return {tokenId, address};
}

export async function mintNFT(
    client: Client,
    tokenId: string,
    count: number
): Promise<number[]> {
    const allSerials: number[] = [];
    const batchSize = 10;
    for (let i = 0; i < count; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, count - i);
        const metadata = Array(currentBatchSize).fill(Buffer.from('ipfs://test'));

        const tx = await new TokenMintTransaction()
            .setTokenId(tokenId)
            .setMetadata(metadata)
            .freezeWith(client)
            .execute(client);

        const receipt = await tx.getReceipt(client);
        const serials = receipt.serials.map(s => s.toNumber());
        allSerials.push(...serials);
    }
    return allSerials;
}

export async function transferNFTs(
    client: Client,
    tokenId: string,
    serials: number[],
    from: string | AccountId,
    to: string | AccountId
): Promise<void> {
    const batchSize = 10;
    for (let i = 0; i < serials.length; i += batchSize) {
        const batch = serials.slice(i, i + batchSize);
        const transferTx = new TransferTransaction();
        for (const serial of batch) {
            transferTx.addNftTransfer(tokenId, serial, from, to);
        }
        await (await transferTx.freezeWith(client).execute(client)).getReceipt(client);
    }
}

export async function executeContract(
    client: Client,
    contractId: string,
    functionName: string,
    params: ContractFunctionParameters,
    gas: number = 1000000
): Promise<{ receipt: any, record: any }> {
    const tx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(gas)
        .setFunction(functionName, params)
        .freezeWith(client)
        .execute(client);

    const receipt = await tx.getReceipt(client);
    const record = await new TransactionRecordQuery()
        .setTransactionId(tx.transactionId)
        .execute(client);

    return {receipt, record};
}

export async function executeContractRaw(
    client: Client,
    contractId: string,
    functionName: string,
    abi: string[],
    args: any[],
    gas: number = 1000000
): Promise<{ receipt: any, record: any }> {
    const iface = new ethers.Interface(abi);
    const encodedData = iface.encodeFunctionData(functionName, args);
    const params = Buffer.from(encodedData.slice(2), 'hex');

    const tx = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(gas)
        .setFunctionParameters(params)
        .freezeWith(client)
        .execute(client);

    const receipt = await tx.getReceipt(client);
    const record = await new TransactionRecordQuery()
        .setTransactionId(tx.transactionId)
        .execute(client);

    return {receipt, record};
}

const BALANCE_POLL_TIMEOUT_MS = 30_000;
const BALANCE_POLL_INTERVAL_MS = 1_000;
// Longer than the mirror node lag: a "no change" outcome cannot be polled for
const BALANCE_SETTLE_MS = 10_000;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Reads a token balance from the mirror node. The mirror node lags consensus
 * by a few seconds, so a read right after a transaction can be stale - use
 * waitForTokenBalance when the expected outcome is known.
 */
export async function getTokenBalance(
    client: Client,
    accountId: string,
    tokenId: string
): Promise<number> {
    const tokenBalance = await new MirrorNodeTokenBalanceQuery()
        .setAccountId(accountId)
        .setTokenId(tokenId)
        .execute(client);

    return tokenBalance.balance.toNumber();
}

/**
 * Polls the token balance until `isExpected` accepts it. Returns the last
 * balance read when the timeout expires, so the caller's own assertion reports
 * the mismatch. Read errors (e.g. the account is not yet visible on the mirror
 * node) are retried; if no read ever succeeds the last error is thrown.
 */
export async function waitForTokenBalance(
    client: Client,
    accountId: string,
    tokenId: string,
    isExpected: (balance: number) => boolean,
    timeoutMs: number = BALANCE_POLL_TIMEOUT_MS
): Promise<number> {
    const deadline = Date.now() + timeoutMs;
    let balance: number | undefined;
    let lastError: unknown;

    for (;;) {
        try {
            balance = await getTokenBalance(client, accountId, tokenId);
            if (isExpected(balance)) {
                return balance;
            }
        } catch (error) {
            lastError = error;
        }

        if (Date.now() >= deadline) {
            if (balance === undefined) {
                throw lastError;
            }
            return balance;
        }
        await sleep(BALANCE_POLL_INTERVAL_MS);
    }
}

/**
 * Balance of an account that has just been funded: waits until the funding
 * transfer is visible on the mirror node.
 */
export function waitForFundedTokenBalance(
    client: Client,
    accountId: string,
    tokenId: string
): Promise<number> {
    return waitForTokenBalance(client, accountId, tokenId, balance => balance > 0);
}

export function solidityAddressToTokenId(address: string): string {
    const hex = address.replace('0x', '').replace(/^0+/, '');
    const num = BigInt('0x' + hex);
    return `0.0.${num}`;
}

export function accountIdToSolidityAddress(accountId: string): string {
    const num = accountId.split('.')[2];
    const hexNum = parseInt(num, 10).toString(16);
    const paddedAddress = hexNum.padStart(40, '0');
    return `0x${paddedAddress}`;
}

export async function createAccount(
    client: Client,
    initialBalance: number = 10
): Promise<{ accountId: string; privateKey: PrivateKey; address: string }> {
    const newPrivateKey = PrivateKey.generateED25519();
    const newPublicKey = newPrivateKey.publicKey;

    const tx = await new AccountCreateTransaction()
        .setKey(newPublicKey)
        .setInitialBalance(new Hbar(initialBalance))
        .freezeWith(client)
        .execute(client);

    const receipt = await tx.getReceipt(client);
    const accountId = receipt.accountId!.toString();
    const address = accountIdToSolidityAddress(accountId);

    return {accountId, privateKey: newPrivateKey, address};
}

export async function assertBalanceChange(
    client: Client,
    accountId: string,
    tokenId: string,
    expectedChange: number,
    action: () => Promise<any>
) {
    const initialBalance = await waitForFundedTokenBalance(client, accountId, tokenId);
    const result = await action();
    if (expectedChange === 0) {
        // Already true on the first read, which may predate the mirror node
        // seeing the action's transactions, so let it catch up first.
        await sleep(BALANCE_SETTLE_MS);
    }
    const finalBalance = await waitForTokenBalance(
        client,
        accountId,
        tokenId,
        balance => balance - initialBalance === expectedChange
    );
    const actualChange = finalBalance - initialBalance;

    if (actualChange !== expectedChange) {
        throw new Error(`Balance change mismatch for token ${tokenId}. Expected ${expectedChange}, got ${actualChange}`);
    }
    return result;
}

export function parseLogs(abi: string[], record: any) {
    const iface = new ethers.Interface(abi);
    return record.contractFunctionResult.logs.map((log: any) => {
        try {
            return iface.parseLog({
                topics: log.topics.map((t: any) => '0x' + Buffer.from(t).toString('hex')),
                data: '0x' + Buffer.from(log.data).toString('hex')
            });
        } catch (e) {
            return null;
        }
    }).filter((l: any) => l !== null);
}
