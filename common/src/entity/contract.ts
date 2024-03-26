import { Entity, Enum, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { ContractType, IContract } from '@guardian/interfaces';

/**
 * Contract collection
 */
@Entity()
export class Contract extends BaseEntity implements IContract {
    /**
     * Hedera Contract Id
     */
    @Property()
    contractId: string;

    /**
     * Description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Owner
     */
    @Property()
    owner: string;

    /**
     * Contract permissions
     */
    @Property()
    permissions: number = 0;

    /**
     * Topic id
     */
    @Property()
    topicId: string;

    /**
     * Type
     */
    @Enum(() => ContractType)
    type: ContractType;

    /**
     * Sync requests date
     */
    @Property({ nullable: true })
    syncRequestsDate?: Date;

    /**
     * Sync pools date
     */
    @Property({ nullable: true })
    syncPoolsDate?: Date;

    /**
     * Sync event timestamp
     */
    @Property({ nullable: true })
    lastSyncEventTimeStamp?: string;

    /**
     * Wipe contract ids
     */
    @Property()
    wipeContractIds: string[] = [];

    /**
     * Sync disabled
     */
    @Property()
    syncDisabled: boolean = false;
}
