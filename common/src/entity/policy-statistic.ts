import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * PolicyStatistic collection
 */
@Entity()
export class PolicyStatistic extends BaseEntity {
    /**
     * Tag id
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Tag label
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Tag description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Tag owner
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Tool creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Target ID
     */
    @Property({ nullable: true })
    status?: 'Draft' | 'Published';

    /**
     * Topic id
     */
    @Property({
        nullable: true,
        index: true
    })
    topicId?: string;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
        this.status = this.status || 'Draft';
    }
}
