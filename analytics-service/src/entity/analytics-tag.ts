import { Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Schema collection
 */
@Entity()
export class AnalyticsTag extends BaseEntity {
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
     * Tag Id
     */
    @Property({ nullable: true })
    tagUUID?: string;

    /**
     * Name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Target
     */
    @Property({ nullable: true })
    target?: string;

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
     * Date
     */
    @Property({ nullable: true })
    date?: string;

    /**
     * Operation
     */
    @Property({ nullable: true })
    operation?: string;

    /**
     * Entity
     */
    @Property({ nullable: true })
    entity?: string;
}
