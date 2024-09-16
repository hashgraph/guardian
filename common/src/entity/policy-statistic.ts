import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * PolicyStatistic collection
 */
@Entity()
export class PolicyStatistic extends BaseEntity {
    /**
     * ID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Label
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Owner
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Status
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
     * Policy Topic id
     */
    @Property({
        nullable: true,
        index: true
    })
    instanceTopicId?: string;

    /**
     * Config
     */
    @Property({ nullable: true, type: 'unknown' })
    config?: any;

    /**
     * Method
     */
    @Property({ nullable: true })
    method?: string;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
        this.status = this.status || 'Draft';
    }
}
