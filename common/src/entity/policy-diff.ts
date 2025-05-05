import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { ObjectId } from '@mikro-orm/mongodb';

/**
 * Policy Diff
 */
@Entity()
export class PolicyDiff extends BaseEntity {
    /**
     * ID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * TopicId
     */
    @Property({ nullable: true })
    policyTopicId?: string;

    /**
     * TopicId
     */
    @Property({ nullable: true })
    instanceTopicId?: string;

    /**
     * TopicId
     */
    @Property({ nullable: true })
    restoreTopicId?: string;

    /**
     * Last Update
     */
    @Property({ nullable: true })
    lastUpdate?: Date;

    /**
     * VC
     */
    @Property({ nullable: true })
    file?: any;

    /**
     * VC
     */
    @Property({ nullable: true })
    fileId?: ObjectId;

    /**
     * Type
     */
    @Property({ nullable: true })
    type?: 'restore' | 'backup';

    /**
     * Type
     */
    @Property({ nullable: true })
    valid?: boolean;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
    }
}