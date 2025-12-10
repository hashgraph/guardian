import { Entity, Property, Index } from '@mikro-orm/core';
import { BaseEntity } from '../models/base-entity.js';

@Entity()
@Index({ name: 'drss_policy_savepoint', properties: ['policyId', 'savepointId'] })
@Index({ name: 'drss_policy_savepoint_source', properties: ['policyId','savepointId','sourceId'], options: { unique: true } })
export class DryRunSavepointSnapshot extends BaseEntity {
    @Property()
    policyId!: string;

    @Property()
    savepointId!: string;

    @Property()
    sourceId!: string;

    @Property({ type: 'unknown', nullable: true })
    options?: Record<string, any>;
}
