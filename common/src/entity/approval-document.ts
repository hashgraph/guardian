import {
    ApproveStatus,
    GenerateUUIDv4,
    IApprovalDocument,
    IVC,
} from '@guardian/interfaces';
import {
    Entity,
    Property,
    BeforeCreate,
    Enum,
    BeforeUpdate,
    OnLoad,
    AfterDelete,
    AfterCreate,
    AfterUpdate,
} from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/index.js';
import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';
import { DeleteCache } from './delete-cache.js';

/**
 * Document for approve
 */
@Entity()
export class ApprovalDocument extends RestoreEntity implements IApprovalDocument {
    /**
     * Document owner
     */
    @Property({
        nullable: true,
        index: true,
    })
    owner?: string;

    /**
     * Document approver
     */
    @Property({ nullable: true })
    approver?: string;

    /**
     * Document instance
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: IVC;

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
     * Document policy id
     */
    @Property({
        nullable: true,
        index: true,
    })
    policyId?: string;

    /**
     * Document type
     */
    @Enum({ nullable: true })
    type?: string;

    /**
     * Document tag
     */
    @Property({ nullable: true })
    tag?: string;

    /**
     * Document option
     */
    @Property({ nullable: true, type: 'unknown' })
    option?: any;

    /**
     * Document schema
     */
    @Property({ nullable: true })
    schema?: string;

    /**
     * User group
     */
    @Property({ nullable: true, type: 'unknown' })
    group?: any;

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
     * Default document values
     */
    @BeforeCreate()
    setDefaults() {
        this.option = this.option || {};
        this.option.status = this.option.status || ApproveStatus.NEW;
    }

    private _createDocument(document: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                const fileStream = DataBaseHelper.gridFS.openUploadStream(GenerateUUIDv4());
                this.documentFileId = fileStream.id;
                fileStream.write(document);
                fileStream.end(() => resolve());
            } catch (error) {
                reject(error)
            }
        });
    }

    private _createFieldCache(fields?: string[]): any {
        if (fields) {
            const newDocument: any = {};
            for (const field of fields) {
                const fieldValue = ObjGet(this.document, field)
                if (
                    typeof fieldValue === 'number' ||
                    (
                        typeof fieldValue === 'string' &&
                        fieldValue.length < (+process.env.DOCUMENT_CACHE_FIELD_LIMIT || 100)
                    )
                ) {
                    ObjSet(newDocument, field, fieldValue);
                }
            }
            return newDocument;
        } else {
            return null;
        }
    }

    /**
     * Create document
     */
    @BeforeCreate()
    async createDocument() {
        if (this.document) {
            const document = JSON.stringify(this.document);
            await this._createDocument(document);
            this.document = this._createFieldCache(this.documentFields);
            if (!this.document) {
                delete this.document;
            }
            this._updateDocHash(document);
        } else {
            this._updateDocHash('');
        }
        const prop: any = {};
        prop.owner = this.owner;
        prop.approver = this.approver;
        prop.documentFields = this.documentFields;
        prop.policyId = this.policyId;
        prop.type = this.type;
        prop.tag = this.tag;
        prop.option = this.option;
        prop.schema = this.schema;
        prop.group = this.group;
        prop.messageHash = this.messageHash;
        prop.messageIds = this.messageIds;
        this._updatePropHash(prop);
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.document && this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch(console.error);
        }
        await this.createDocument();
    }

    /**
     * Load document
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadDocument() {
        if (this.documentFileId) {
            const fileStream = DataBaseHelper.gridFS.openDownloadStream(
                this.documentFileId
            );
            const bufferArray = [];
            for await (const data of fileStream) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.document = JSON.parse(buffer.toString());
        }
    }

    /**
     * Delete document
     */
    @AfterDelete()
    deleteDocument() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch(console.error);
        }
    }

    /**
     * Save delete cache
     */
    @AfterDelete()
    override async deleteCache() {
        try {
            new DataBaseHelper(DeleteCache).save({
                rowId: this._id?.toString(),
                policyId: this.policyId,
                collection: 'ApprovalDocument',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
