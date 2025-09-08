import {
    ApproveStatus,
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
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _documentFileId?: ObjectId;

    /**
     * Set defaults
     */
    @BeforeCreate()
    async setDefaults() {
        this.option = this.option || {};
        this.option.status = this.option.status || ApproveStatus.NEW;
        if (this.document) {
            const document = JSON.stringify(this.document);
            this.documentFileId = await this._createFile(document, 'ApprovalDocument');
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
        return prop;
    }

    /**
     * Load File
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.documentFileId) {
            const buffer = await this._loadFile(this.documentFileId);
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
            const documentFileId = await this._createFile(document, 'ApprovalDocument');
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
                    console.error(`AfterUpdate: ApprovalDocument, ${this._id}, _documentFileId`)
                    console.error(reason)
                });
            delete this._documentFileId;
        }
    }

    /**
     * Delete context
     */
    @AfterDelete()
    deleteFiles() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: ApprovalDocument, ${this._id}, documentFileId`)
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
                collection: 'ApprovalDocument',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
