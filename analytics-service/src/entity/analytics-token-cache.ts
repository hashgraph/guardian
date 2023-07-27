import { BeforeCreate, Entity, Index, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Token collection
 */
@Entity()
@Unique({ properties: ['tokenId'], options: { partialFilterExpression: { tokenId: { $type: 'string' } } } })
@Index({ name: 'token_idx', properties: ['uuid', 'tokenId'] })
export class AnalyticsTokenCache extends BaseEntity {
    /**
     * Report UUID
     */
    @Index({ name: 'report_uuid' })
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Token ID
     */
    @Property({ nullable: true })
    tokenId?: string;

    /**
     * Last message timeStamp
     */
    @Property({ nullable: true })
    timeStamp?: string;

    /**
     * Last message index
     */
    @Property({ nullable: true })
    index?: number;

    /**
     * Last balance
     */
    @Property({ nullable: true })
    balance?: number;

    /**
     * Topic Id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
        this.balance = this.balance || 0;
    }
}
