import { DidDocumentStatus, DocumentStatus, IDidObject } from '@guardian/interfaces';
import {
    Entity,
    Unique,
    Property,
    Enum,
    BeforeCreate,
    BeforeUpdate,
    AfterDelete
} from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DeleteCache } from './delete-cache.js';
import { DataBaseHelper } from '../helpers/db-helper.js';

/**
 * DID document
 */
@Entity()
@Unique({ properties: ['did'], options: { partialFilterExpression: { did: { $type: 'string' } } } })
export class DidDocument extends RestoreEntity implements IDidObject {
    /**
     * DID
     */
    @Property({
        nullable: true,
        // index: true
    })
    did?: string;

    /**
     * Document instance
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: any;

    /**
     * Document status
     */
    @Enum({ nullable: true })
    status?: DidDocumentStatus;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Hedera Status
     */
    @Property({ nullable: true })
    hederaStatus?: DocumentStatus;

    /**
     * Type
     */
    @Property({ nullable: true })
    type?: string;

    /**
     * Hash
     */
    @Property({ nullable: true })
    hash?: string;

    /**
     * Hedera Hash
     */
    @Property({ nullable: true })
    messageHash?: string;

    /**
     * Message History
     */
    @Property({ nullable: true })
    messageIds?: string[];

    /**
     * Relationships
     */
    @Property({ nullable: true })
    relationships?: string[];

    /**
     * Verification methods
     */
    @Property({ nullable: true, type: 'unknown' })
    verificationMethods?: any;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true,
    })
    policyId?: string;

    /**
     * Create document
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument() {
        this.status = this.status || DidDocumentStatus.NEW;
        if (this.document) {
            const document = JSON.stringify(this.document);
            this._updateDocHash(document);
        } else {
            this._updateDocHash('');
        }
        const prop: any = {};
        prop.did = this.did;
        prop.status = this.status;
        prop.type = this.type;
        prop.hash = this.hash;
        prop.hederaStatus = this.hederaStatus;
        prop.messageHash = this.messageHash;
        prop.messageId = this.messageId;
        prop.messageIds = this.messageIds;
        prop.topicId = this.topicId;
        prop.relationships = this.relationships;
        prop.verificationMethods = this.verificationMethods;
        prop.policyId = this.policyId;
        this._updatePropHash(prop);
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
                collection: 'DidDocument',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
