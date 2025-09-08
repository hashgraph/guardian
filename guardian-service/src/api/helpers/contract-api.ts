import { Workers } from '@guardian/common';
import {
    ContractAPI,
    ContractType,
    ITask,
    WorkerTaskType,
} from '@guardian/interfaces';

const CONTRACT_GAS_DEFAULT_VALUES = new Map<ContractAPI | string, number>([
    ['CREATE_RETIRE_CONTRACT_GAS', 3000000],
    ['CREATE_WIPE_CONTRACT_GAS', 2000000],
    [ContractAPI.RETIRE_SINGLE_CONTRACT_GAS, 6000000],
    [ContractAPI.RETIRE_DOUBLE_CONTRACT_GAS, 7000000],
    [ContractAPI.RETIRE_ADMIN_ROLE_GAS, 300000],
    [ContractAPI.CONTRACT_PERMISSIONS, 300000],
    [ContractAPI.SET_RETIRE_POOLS, 3000000],
    [ContractAPI.CONTRACT_PERMISSIONS, 100000],
    [ContractAPI.ENABLE_WIPE_REQUESTS, 1000000],
    [ContractAPI.DISABLE_WIPE_REQUESTS, 1000000],
    [ContractAPI.APPROVE_WIPE_REQUEST, 1000000],
    [ContractAPI.REJECT_WIPE_REQUEST, 1000000],
    [ContractAPI.CLEAR_WIPE_REQUESTS, 3000000],
    [ContractAPI.ADD_WIPE_ADMIN, 1000000],
    [ContractAPI.REMOVE_WIPE_ADMIN, 1000000],
    [ContractAPI.ADD_WIPE_MANAGER, 1000000],
    [ContractAPI.REMOVE_WIPE_MANAGER, 1000000],
    [ContractAPI.ADD_WIPE_WIPER, 1000000],
    [ContractAPI.REMOVE_WIPE_WIPER, 1000000],
    [ContractAPI.CLEAR_RETIRE_REQUESTS, 3000000],
    [ContractAPI.CLEAR_RETIRE_POOLS, 3000000],
    [ContractAPI.UNSET_RETIRE_POOLS, 3000000],
    [ContractAPI.UNSET_RETIRE_REQUEST, 3000000],
    [ContractAPI.RETIRE, 1000000],
    [ContractAPI.APPROVE_RETIRE, 1000000],
    [ContractAPI.CANCEL_RETIRE, 1000000],
    [ContractAPI.ADD_RETIRE_ADMIN, 1000000],
    [ContractAPI.REMOVE_RETIRE_ADMIN, 1000000],
]);

export async function customContractCall(
    event: ContractAPI,
    workers: Workers,
    contractId: string,
    hederaAccountId: string,
    hederaAccountKey: string,
    parameters: any,
    userId: string | null
) {
    return await _contractCall(
        event,
        workers,
        {
            type: WorkerTaskType.CUSTOM_CONTRACT_CALL,
            data: {
                contractId,
                hederaAccountId,
                hederaAccountKey,
                parameters,
                payload: { userId }
            },
        },
        20
    );
}

export async function contractCall(
    event: ContractAPI,
    workers: Workers,
    contractId: string,
    hederaAccountId: string,
    hederaAccountKey: string,
    functionName: string,
    parameters?
) {
    return await _contractCall(
        event,
        workers,
        {
            type: WorkerTaskType.CONTRACT_CALL,
            data: {
                contractId,
                hederaAccountId,
                hederaAccountKey,
                functionName,
                parameters,
            },
        },
        20
    );
}

export async function contractQuery(
    event: ContractAPI,
    workers: Workers,
    contractId: string,
    hederaAccountId: string,
    hederaAccountKey: string,
    functionName: string
) {
    return await _contractCall(
        event,
        workers,
        {
            type: WorkerTaskType.CONTRACT_QUERY,
            data: {
                contractId,
                hederaAccountId,
                hederaAccountKey,
                functionName,
            },
        },
        20
    );
}

export async function createContract(
    event: ContractAPI,
    workers: Workers,
    type: ContractType,
    hederaAccountId: string,
    hederaAccountKey: string,
    memo: string,
    userId: string
) {
    return await _contractCall(
        event,
        workers,
        {
            type: WorkerTaskType.CREATE_CONTRACT,
            data: {
                bytecodeFileId:
                    type === ContractType.WIPE
                        ? process.env.WIPE_CONTRACT_FILE_ID
                        : process.env.RETIRE_CONTRACT_FILE_ID,
                hederaAccountId,
                hederaAccountKey,
                topicKey: hederaAccountKey,
                memo,
                userId
            },
        },
        20,
        type
    );
}

/**
 * Create contract V2 22.07.2025
 */
export async function createContractV2(
    event: ContractAPI,
    workers: Workers,
    type: ContractType,
    hederaAccountId: string,
    hederaAccountKey: string,
    memo: string,
    userId: string
) {
    const constructorParams =
        type === ContractType.RETIRE
            ? {
                retireSingleFileId: process.env.RETIRE_SINGLE_FILE_ID,
                retireDoubleFileId: process.env.RETIRE_DOUBLE_FILE_ID,
                retireSingleContractGas: CONTRACT_GAS_DEFAULT_VALUES.get('RETIRE_SINGLE_CONTRACT_GAS'),
                retireDoubleContractGas: CONTRACT_GAS_DEFAULT_VALUES.get('RETIRE_DOUBLE_CONTRACT_GAS'),
                retireAdminRoleGas: CONTRACT_GAS_DEFAULT_VALUES.get('RETIRE_ADMIN_ROLE_GAS')
            }
            : undefined;

    return await _contractCall(
        event,
        workers,
        {
            type: WorkerTaskType.CREATE_CONTRACT_V2,
            data: {
                bytecodeFileId:
                    type === ContractType.WIPE
                        ? process.env.WIPE_CONTRACT_FILE_ID
                        : process.env.RETIRE_CONTRACT_FILE_ID,
                hederaAccountId,
                hederaAccountKey,
                topicKey: hederaAccountKey,
                memo,
                constructorParams,
                userId
            },
        },
        20,
        type
    );
}

export async function _contractCall(
    event: ContractAPI,
    workers: Workers,
    task: ITask,
    priority: number,
    type?: ContractType
) {
    if (event === ContractAPI.CREATE_CONTRACT) {
        task.data.gas = process.env[`CREATE_${type}_CONTRACT_GAS`]
            ? Number(process.env[`CREATE_${type}_CONTRACT_GAS`])
            : CONTRACT_GAS_DEFAULT_VALUES.get(`CREATE_${type}_CONTRACT_GAS`);
    } else {
        task.data.gas = process.env[`${event}_GAS`]
            ? Number(process.env[`${event}_GAS`])
            : CONTRACT_GAS_DEFAULT_VALUES.get(event);
    }
    try {
        return await workers.addNonRetryableTask(task, { priority });
    } catch (error) {
        throw error;
    }
}
