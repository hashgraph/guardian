import { Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Module collection
 */
@Entity()
export class AnalyticsModule extends BaseEntity {
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
     * Module Name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Module description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Module Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Action
     */
    @Property({ nullable: true })
    action?: string;
}
