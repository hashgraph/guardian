import { BeforeCreate, Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Module collection
 */
@Entity()
export class AnalyticsToken extends BaseEntity {
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
     * Topic ID
     */
    @Property({ nullable: true })
    policyTopicId?: string;

    /**
     * Token Id
     */
    @Property({ nullable: true })
    tokenId?: string;

    /**
     * Token Name
     */
    @Property({ nullable: true })
    tokenName?: string;

    /**
     * Token Symbol
     */
    @Property({ nullable: true })
    tokenSymbol?: string;

    /**
     * Token Type
     */
    @Property({ nullable: true })
    tokenType?: string;

    /**
     * Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
    }
}
