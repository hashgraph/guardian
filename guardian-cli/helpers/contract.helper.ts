import {AccountId, Client, ContractExecuteTransaction, ContractFunctionParameters, PrivateKey, Status,} from '@hiero-ledger/sdk';
import {Network} from './contract-publisher.helper.js';

export interface ContractCredentials {
    operatorId: string;
    operatorKey: string;
}

function getMirrorNodeUrl(network?: Network): string {
    switch (network) {
        case Network.MAINNET:
            return 'https://mainnet.mirrornode.hedera.com';
        case Network.PREVIEWNET:
            return 'https://previewnet.mirrornode.hedera.com';
        default:
            return 'https://testnet.mirrornode.hedera.com';
    }
}

function parsePrivateKey(key: string): PrivateKey {
    if (key.startsWith('302e')) {
        return PrivateKey.fromStringED25519(key);
    }
    if (key.startsWith('3030')) {
        return PrivateKey.fromStringECDSA(key);
    }
    if (key.startsWith('0x')) {
        return PrivateKey.fromStringECDSA(key);
    }
    return PrivateKey.fromStringDer(key);
}

async function resolveEvmAddress(accountId: string, network?: Network): Promise<string> {
    const url = `${getMirrorNodeUrl(network)}/api/v1/accounts/${accountId}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to resolve EVM address for ${accountId}: mirror node returned ${res.status}`);
    }
    const data = await res.json() as { evm_address?: string };
    if (!data.evm_address) {
        throw new Error(`Failed to resolve EVM address for ${accountId}: no evm_address in response`);
    }
    return data.evm_address;
}

/**
 * Contract helper
 */
export class ContractHelper {
    /**
     * Execute contract function
     * @param contractId Contract identifier
     * @param functionName Function name
     * @param params Parameters
     * @param gas Gas
     * @param credentials Credentials
     * @param network Network
     * @returns Receipt
     */
    public static async executeContractFunction(
        contractId: string,
        functionName: string,
        params: ContractFunctionParameters,
        gas: number = 2000000,
        credentials: { operatorId: string; operatorKey: string },
        network?: Network
    ) {
        let client: Client;
        switch (network) {
            case Network.MAINNET:
                client = Client.forMainnet();
                break;
            case Network.PREVIEWNET:
                client = Client.forPreviewnet();
                break;
            default:
                client = Client.forTestnet();
        }
        const operatorKey = parsePrivateKey(credentials.operatorKey);
        client = client.setOperator(credentials.operatorId, operatorKey);
        try {
            const contractExecuteTx = new ContractExecuteTransaction()
                .setContractId(contractId)
                .setGas(gas)
                .setFunction(functionName, params);
            const contractExecuteEx = await contractExecuteTx.execute(client);
            const contractExecuteTr = await contractExecuteEx.getReceipt(client);
            if (contractExecuteTr.status !== Status.Success) {
                throw new Error(`Error while executing contract function: ${contractExecuteTr.status.toString()}`);
            }
            return contractExecuteTr;
        } catch (error) {
            throw error;
        } finally {
            client.close();
        }
    }

    /**
     * Propose new owner for contract
     * @param contractId Contract identifier
     * @param newOwnerAddress New owner hedera account id or evm address
     * @param gas Gas
     * @param credentials Credentials
     * @param network Network
     * @returns Receipt
     */
    public static async proposeOwner(
        contractId: string,
        newOwnerAddress: string,
        gas: number = 2000000,
        credentials: ContractCredentials,
        network?: Network
    ) {
        const evmAddress = newOwnerAddress.startsWith('0x')
            ? newOwnerAddress
            : await resolveEvmAddress(newOwnerAddress, network);
        const params = new ContractFunctionParameters().addAddress(evmAddress);
        return ContractHelper.executeContractFunction(contractId, 'proposeOwner', params, gas, credentials, network);
    }

    /**
     * Claim ownership for contract
     * @param contractId Contract identifier
     * @param gas Gas
     * @param credentials Credentials
     * @param network Network
     * @returns Receipt
     */
    public static async claimOwner(
        contractId: string,
        gas: number = 2000000,
        credentials: ContractCredentials,
        network?: Network
    ) {
        const params = new ContractFunctionParameters();
        return ContractHelper.executeContractFunction(contractId, 'claimOwner', params, gas, credentials, network);
    }

    /**
     * Remove owner from contract
     * @param contractId Contract identifier
     * @param ownerAddress Owner hedera account id or evm address
     * @param gas Gas
     * @param credentials Credentials
     * @param network Network
     * @returns Receipt
     */
    public static async removeOwner(
        contractId: string,
        ownerAddress: string,
        gas: number = 2000000,
        credentials: ContractCredentials,
        network?: Network
    ) {
        const evmAddress = ownerAddress.startsWith('0x')
            ? ownerAddress
            : await resolveEvmAddress(ownerAddress, network);
        const params = new ContractFunctionParameters().addAddress(evmAddress);
        return ContractHelper.executeContractFunction(contractId, 'removeOwner', params, gas, credentials, network);
    }
}
