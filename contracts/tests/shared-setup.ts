import {Client} from '@hiero-ledger/sdk';
import {deployContract, getClient} from './helpers';

export const sharedState = {
    client: null as Client | null,
    operatorId: '',

    wipeContractId: '',
    wipeContractAddress: '',

    retireSingleContractId: '',
    retireSingleContractAddress: '',

    retireDoubleContractId: '',
    retireDoubleContractAddress: '',
};

export async function initializeClient() {
    if (!sharedState.client) {
        sharedState.client = getClient();
        sharedState.operatorId = sharedState.client.operatorAccountId!.toString();
    }
    return sharedState.client;
}

let wipeDeploymentPromise: Promise<any> | null = null;
let retireSingleDeploymentPromise: Promise<any> | null = null;
let retireDoubleDeploymentPromise: Promise<any> | null = null;

export async function deployWipeContract() {
    if (!sharedState.wipeContractId) {
        if (!wipeDeploymentPromise) {
            wipeDeploymentPromise = (async () => {
                const client = await initializeClient();
                const result = await deployContract(client, 'Wipe', 4000000);
                sharedState.wipeContractId = result.contractId;
                sharedState.wipeContractAddress = result.address;
                return result;
            })();
        }
        await wipeDeploymentPromise;
    }
    return {
        contractId: sharedState.wipeContractId,
        address: sharedState.wipeContractAddress,
    };
}

export async function deployRetireSingleContract() {
    if (!sharedState.retireSingleContractId) {
        if (!retireSingleDeploymentPromise) {
            retireSingleDeploymentPromise = (async () => {
                const client = await initializeClient();
                const result = await deployContract(client, 'RetireSingleToken', 8000000);
                sharedState.retireSingleContractId = result.contractId;
                sharedState.retireSingleContractAddress = result.address;
                return result;
            })();
        }
        await retireSingleDeploymentPromise;
    }
    return {
        contractId: sharedState.retireSingleContractId,
        address: sharedState.retireSingleContractAddress,
    };
}

export async function deployRetireDoubleContract() {
    if (!sharedState.retireDoubleContractId) {
        if (!retireDoubleDeploymentPromise) {
            retireDoubleDeploymentPromise = (async () => {
                const client = await initializeClient();
                const result = await deployContract(client, 'RetireDoubleToken', 8000000);
                sharedState.retireDoubleContractId = result.contractId;
                sharedState.retireDoubleContractAddress = result.address;
                return result;
            })();
        }
        await retireDoubleDeploymentPromise;
    }
    return {
        contractId: sharedState.retireDoubleContractId,
        address: sharedState.retireDoubleContractAddress,
    };
}

export function closeClient() {
    if (sharedState.client) {
        sharedState.client.close();
        sharedState.client = null;
    }
}
