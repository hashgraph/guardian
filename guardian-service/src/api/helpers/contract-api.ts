import { Workers } from '@guardian/common';
import {
    ContractAPI,
    ContractType,
    ITask,
    WorkerTaskType,
} from '@guardian/interfaces';

const CONTRACT_GAS_DEFAULT_VALUES = new Map<ContractAPI | string, number>([
    ['CREATE_RETIRE_CONTRACT_GAS', 3000000],
    ['CREATE_WIPE_CONTRACT_GAS', 1000000],
    [ContractAPI.SET_RETIRE_POOLS, 1000000],
    [ContractAPI.CONTRACT_PERMISSIONS, 100000],
    [ContractAPI.ENABLE_WIPE_REQUESTS, 1000000],
    [ContractAPI.DISABLE_WIPE_REQUESTS, 1000000],
    [ContractAPI.APPROVE_WIPE_REQUEST, 1000000],
    [ContractAPI.REJECT_WIPE_REQUEST, 1000000],
    [ContractAPI.CLEAR_WIPE_REQUESTS, 1000000],
    [ContractAPI.ADD_WIPE_ADMIN, 1000000],
    [ContractAPI.REMOVE_WIPE_ADMIN, 1000000],
    [ContractAPI.ADD_WIPE_MANAGER, 1000000],
    [ContractAPI.REMOVE_WIPE_MANAGER, 1000000],
    [ContractAPI.ADD_WIPE_WIPER, 1000000],
    [ContractAPI.REMOVE_WIPE_WIPER, 1000000],
    [ContractAPI.CLEAR_RETIRE_REQUESTS, 1000000],
    [ContractAPI.CLEAR_RETIRE_POOLS, 1000000],
    [ContractAPI.UNSET_RETIRE_POOLS, 1000000],
    [ContractAPI.UNSET_RETIRE_REQUEST, 1000000],
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
    parameters
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
    memo: string
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
        return await workers.addNonRetryableTask(task, priority);
    } catch (error) {
        throw error;
    }
}
