import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { EntityStatus, GenerateUUIDv4, IFormula, IFormulaConfig } from '@guardian/interfaces';

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
    diffTopicId?: string;

    /**
     * VC
     */
    @Property({ nullable: true })
    vcCollectionId?: any;

    /**
     * Last Update
     */
    @Property({ nullable: true })
    lastUpdate?: Date;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
    }
}