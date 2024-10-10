import { BeforeCreate, Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';
import { DocumentType } from '../interfaces/document.type.js';

/**
 * Document collection
 */
@Entity()
@Index({ name: 'document_type_idx', properties: ['uuid', 'type'] })
@Index({ name: 'policy_instance_idx', properties: ['uuid', 'instanceTopicId'] })
@Index({ name: 'policy_idx', properties: ['uuid', 'policyTopicId'] })
@Index({ name: 'policy_idx_2', properties: ['uuid', 'policyUUID'] })
export class AnalyticsDocument extends BaseEntity {
    /**
     * Report UUID
     */
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
     * Document type
     */
    @Property({ nullable: true })
    type?: string;

    /**
     * Document owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Document schema
     */
    @Property({ nullable: true })
    schema?: string;

    /**
     * Policy uuid
     */
    @Property({ nullable: true })
    policyUUID?: string;

    /**
     * Topic ID
     */
    @Property({ nullable: true })
    policyTopicId?: string;

    /**
     * Instance Topic ID
     */
    @Property({ nullable: true })
    instanceTopicId?: string;

    /**
     * Role
     */
    @Property({ nullable: true })
    role?: string;

    /**
     * Group
     */
    @Property({ nullable: true })
    group?: string;

    /**
     * Action
     */
    @Property({ nullable: true })
    action?: string;

    /**
     * IPFS
     */
    @Property({ nullable: true })
    ipfs?: string;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
        this.type = this.type || DocumentType.NONE;
    }
}
