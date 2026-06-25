import { AfterDelete, Entity, Property, Unique } from '@mikro-orm/core';
import { MigrationRunSummary } from '@guardian/interfaces';
import { BaseEntity } from '../models/base-entity.js';
import { MigrationFailedItem } from './migration-failed-item.js';
import { DataBaseHelper } from '../helpers/index.js';

/**
 * Migration run collection
 */
@Entity()
@Unique<typeof MigrationRun, 'srcPolicyId' | 'dstPolicyId'>({
    name: 'migration_run_policy_pair_unique_idx',
    properties: ['srcPolicyId', 'dstPolicyId'],
})
export class MigrationRun extends BaseEntity {
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
     * Current run status
     */
    @Property({ index: true })
    status: string = 'running';

    /**
     * User who started migration
     */
    @Property({ nullable: true })
    startedBy?: string;

    /**
     * Soft stop requested by user
     */
    @Property({ nullable: true, type: 'boolean' })
    stopRequested = false;

    /**
     * Aggregated progress summary
     */
    @Property({ nullable: true, type: 'unknown' })
    summary: MigrationRunSummary = {};

    /**
     * Effective migration config snapshot for this run.
     * Used for safe resume with the same settings.
     */
    @Property({ nullable: true, type: 'unknown' })
    config?: unknown;

    /**
     * Run start timestamp
     */
    @Property({ nullable: true, type: 'unknown' })
    startedAt: Date = new Date();

    /**
     * Run finish timestamp
     */
    @Property({ nullable: true, type: 'unknown' })
    finishedAt?: Date;

    /**
     * Top-level run error
     */
    @Property({ nullable: true })
    error?: string;

    /**
     * Last heartbeat timestamp from migration worker.
     * Used to detect stale runs after service restart/crash.
     */
    @Property({ nullable: true, type: 'unknown', index: true })
    heartbeatAt?: Date;

    /**
     * Delete failed items linked to this run
     */
    @AfterDelete()
    async deleteFailedItems() {
        try {
            await new DataBaseHelper(MigrationFailedItem).delete({
                runId: this.id
            });
        } catch (reason) {
            console.error(`AfterDelete: MigrationRun, ${this._id}`);
            console.error(reason);
        }
    }
}
