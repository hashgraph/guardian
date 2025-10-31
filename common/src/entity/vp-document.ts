import { DocumentSignature, DocumentStatus, IVP, IVPDocument } from '@guardian/interfaces';
import { Entity, Property, Enum, BeforeCreate, BeforeUpdate, OnLoad, AfterDelete, AfterUpdate, AfterCreate } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/index.js';
import { DeleteCache } from './delete-cache.js';

/**
 * VP documents collection
 */
@Entity()
export class VpDocument extends RestoreEntity implements IVPDocument {
    /**
     * Document owner
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Document hash
     */
    @Property({
        nullable: true,
        // index: true
    })
    hash?: string;

    /**
     * Document instance
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: IVP;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

    /**
     * Document fields
     */
    @Property({ nullable: true })
    documentFields?: string[];

    /**
     * Document status
     */
    @Enum({ nullable: true })
    status?: DocumentStatus;

    /**
     * Document signature
     */
    @Enum({ nullable: true })
    signature?: DocumentSignature;

    /**
     * Document type
     */
    @Enum({ nullable: true })
    type?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Tag
     */
    @Property({ nullable: true })
    tag?: string;

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
     * Relationships
     */
    @Property({ nullable: true })
    relationships?: string[];

    /**
     * Option
     */
    @Property({ nullable: true, type: 'unknown' })
    option?: any;

    /**
     * Comment
     */
    @Property({ nullable: true })
    comment?: string;

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
     * Token amount
     */
    @Property({ nullable: true, type: 'unknown' })
    amount?: any;

    /**
     * Token serials
     */
    @Property({ nullable: true, type: 'unknown' })
    serials?: any;

    /**
     * Token Id
     */
    @Property({ nullable: true, type: 'unknown' })
    tokenId?: any;

    /**
     * Relayer Account
     */
    @Property({ nullable: true })
    relayerAccount?: string;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _documentFileId?: ObjectId;

    /**
     * Document defaults
     */
    @BeforeCreate()
    async setDefaults() {
        this.status = this.status || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;

        if (this.document) {
            const document = JSON.stringify(this.document);
            this.documentFileId = await this._createFile(document, 'VpDocument');
            this.document = this._createFieldCache(this.document, this.documentFields);
            if (!this.document) {
                delete this.document;
            }
            this._updateDocHash(document);
        } else {
            this._updateDocHash('');
        }
        this._updatePropHash(this.createProp());
    }

    private createProp(): any {
        const prop: any = {};
        prop.owner = this.owner;
        prop.hash = this.hash;
        prop.type = this.type;
        prop.signature = this.signature;
        prop.status = this.status;
        prop.tag = this.tag;
        prop.messageHash = this.messageHash;
        prop.messageId = this.messageId;
        prop.messageIds = this.messageIds;
        prop.comment = this.comment;
        prop.amount = this.amount;
        prop.serials = this.serials;
        prop.tokenId = this.tokenId;
        prop.option = this.option;
        prop.relationships = this.relationships;
        prop.relayerAccount = this.relayerAccount;
        prop.topicId = this.topicId;
        prop.policyId = this.policyId;
        return prop;
    }

    /**
     * Load document
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.documentFileId) {
            const buffer = await this._loadFile(this.documentFileId)
            this.document = JSON.parse(buffer.toString());
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.document) {
            const document = JSON.stringify(this.document);
            const documentFileId = await this._createFile(document, 'VpDocument');
            if (documentFileId) {
                this._documentFileId = this.documentFileId;
                this.documentFileId = documentFileId;
            }
            this.document = this._createFieldCache(this.document, this.documentFields);
            if (!this.document) {
                delete this.document;
            }
            this._updateDocHash(document);
        }
        this._updatePropHash(this.createProp());
    }

    /**
     * Delete File
     */
    @AfterUpdate()
    postUpdateFiles() {
        if (this._documentFileId) {
            DataBaseHelper.gridFS
                .delete(this._documentFileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: VpDocument, ${this._id}, _documentFileId`)
                    console.error(reason)
                });
            delete this._documentFileId;
        }
    }

    /**
     * Delete document
     */
    @AfterDelete()
    deleteFiles() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: VpDocument, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
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
                collection: 'VpDocument',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
