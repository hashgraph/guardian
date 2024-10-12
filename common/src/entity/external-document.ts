import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';

/**
 * Artifact collection
 */
@Entity()
export class ExternalDocument extends BaseEntity {
    /**
     * Block UUID
     */
    @Property({ nullable: true })
    blockId?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true,
    })
    policyId?: string;

    /**
     * User
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Document Topic Id
     */
    @Property({ nullable: true })
    documentTopicId?: string;

    /**
     * Policy Topic Id
     */
    @Property({ nullable: true })
    policyTopicId?: string;

    /**
     * Instance Topic Id
     */
    @Property({ nullable: true })
    instanceTopicId?: string;

    /**
     * Document Message
     */
    @Property({ nullable: true, type: 'unknown' })
    documentMessage?: any;

    /**
     * Policy Message
     */
    @Property({ nullable: true, type: 'unknown' })
    policyMessage?: any;

    /**
     * Policy Instance Message
     */
    @Property({ nullable: true, type: 'unknown' })
    policyInstanceMessage?: any;

    /**
     * Schemas
     */
    @Property({ nullable: true, type: 'unknown' })
    schemas?: any[];

    /**
     * Schema
     */
    @Property({ nullable: true, type: 'unknown' })
    schema?: any;

    /**
     * Schema Id
     */
    @Property({ nullable: true })
    schemaId?: string;

    /**
     * Status
     */
    @Property({ nullable: true })
    active?: boolean;

    /**
     * Last Message
     */
    @Property({ nullable: true })
    lastMessage?: string;

    /**
     * Last Update
     */
    @Property({ nullable: true })
    lastUpdate?: string;

    /**
     * Status
     */
    @Property({ nullable: true })
    status?: string;

    /**
     * Default document values
     */
    @BeforeCreate()
    setDefaults() {
        this.lastMessage = this.lastMessage || '';
        this.lastUpdate = this.lastUpdate || '';
        this.active = this.active || false;
    }
}
