import { Entity, Index, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../models/base-entity.js';

/**
 * Failed migration item collection
 */
@Entity()
@Unique<typeof MigrationFailedItem, 'runId' | 'entityType' | 'srcEntityId'>({
    name: 'migration_failed_item_unique_idx',
    properties: ['runId', 'entityType', 'srcEntityId'],
})
@Index<typeof MigrationFailedItem, 'runId' | 'entityType'>({
    name: 'migration_failed_item_run_entity_idx',
    properties: ['runId', 'entityType'],
})
@Index<typeof MigrationFailedItem, 'srcPolicyId' | 'dstPolicyId' | 'entityType'>({
    name: 'migration_failed_item_policy_entity_idx',
    properties: ['srcPolicyId', 'dstPolicyId', 'entityType'],
})
export class MigrationFailedItem extends BaseEntity {
    /**
     * Source policy identifier
     */
    @Property({ index: true })
    srcPolicyId!: string;

    /**
     * Destination policy identifier
     */
    @Property({ index: true })
    dstPolicyId!: string;

    /**
     * Entity type (VC, VP, etc.)
     */
    @Property({ index: true })
    entityType!: string;

    /**
     * Source entity id (document/record id in source policy)
     */
    @Property({ index: true })
    srcEntityId!: string;

    /**
     * Run that failed this item
     */
    @Property({ index: true })
    runId!: string;

    /**
     * Number of failed attempts
     */
    @Property({ type: 'number' })
    attemptCount!: number;

    /**
     * Error code
     */
    @Property({ nullable: true })
    errorCode?: string;

    /**
     * Error message
     */
    @Property({ nullable: true })
    errorMessage?: string;

    /**
     * First failure timestamp
     */
    @Property({ type: 'unknown' })
    firstFailedAt!: Date;

    /**
     * Last failure timestamp
     */
    @Property({ type: 'unknown', index: true })
    lastFailedAt!: Date;
}
