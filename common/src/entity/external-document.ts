import { AfterDelete, BeforeCreate, BeforeUpdate, Entity, Property } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/db-helper.js';
import { DeleteCache } from './delete-cache.js';

/**
 * Artifact collection
 */
@Entity()
export class ExternalDocument extends RestoreEntity {
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
     * Create document
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument() {
        this.lastMessage = this.lastMessage || '';
        this.lastUpdate = this.lastUpdate || '';
        this.active = this.active || false;
        const prop: any = {};
        prop.blockId = this.blockId;
        prop.policyId = this.policyId;
        prop.owner = this.owner;
        prop.documentTopicId = this.documentTopicId;
        prop.policyTopicId = this.policyTopicId;
        prop.instanceTopicId = this.instanceTopicId;
        prop.documentMessage = this.documentMessage;
        prop.policyMessage = this.policyMessage;
        prop.policyInstanceMessage = this.policyInstanceMessage;
        prop.schemas = this.schemas;
        prop.schema = this.schema;
        prop.schemaId = this.schemaId;
        prop.active = this.active;
        prop.lastMessage = this.lastMessage;
        prop.lastUpdate = this.lastUpdate;
        prop.status = this.status;
        this._updatePropHash(prop);
        this._updateDocHash('');
    }

    /**
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache() {
        try {
            new DataBaseHelper(DeleteCache).insert({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'ExternalDocument',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
