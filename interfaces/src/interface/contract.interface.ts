import { ContractType } from '../type/index.js';

/**
 * Contract
 */
export class IContract {
    /**
     * Id
     */
    id: string;

    /**
     * Hedera Contract Id
     */
    contractId: string;

    /**
     * Description
     */
    description?: string;

    /**
     * Owner
     */
    owner: string;

    /**
     * Contract permissions
     */
    permissions: number;

    /**
     * Topic id
     */
    topicId: string;

    /**
     * Type
     */
    type: ContractType;

    /**
     * Sync requests date
     */
    syncRequestsDate?: Date;

    /**
     * Sync pools date
     */
    syncPoolsDate?: Date;

    /**
     * Sync event timestamp
     */
    lastSyncEventTimeStamp?: string;

    /**
     * Wipe contract ids
     */
    wipeContractIds: string[];
}
