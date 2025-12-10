import { Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Schema collection
 */
@Entity()
export class AnalyticsSchemaPackage extends BaseEntity {
    /**
     * Report UUID
     */
    @Index({ name: 'report_uuid' })
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Topic ID
     */
    @Property({ nullable: true })
    root?: string;

    /**
     * Message timeStamp
     */
    @Property({ nullable: true })
    timeStamp?: string;

    /**
     * Message payer
     */
    @Property({ nullable: true })
    account?: string;

    /**
     * Schema Name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Schema description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Schema version
     */
    @Property({ nullable: true })
    version?: string;

    /**
     * Schema count
     */
    @Property({ nullable: true })
    schemas?: number;

    /**
     * Schema Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Action
     */
    @Property({ nullable: true })
    action?: string;

    /**
     * Policy Topic Id
     */
    @Property({ nullable: true })
    policyTopicId?: string;

    /**
     * IPFS
     */
    @Property({ nullable: true })
    ipfs?: string;
}