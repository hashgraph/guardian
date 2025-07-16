import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4, PolicyActionStatus, PolicyActionType } from '@guardian/interfaces';
import { DataBaseHelper } from '../helpers/index.js';
import { ObjectId } from '@mikro-orm/mongodb';

/**
 * PolicyActions collection
 */
@Entity()
export class PolicyAction extends BaseEntity {
    /**
     * Action UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Action type
     */
    @Property({ nullable: true })
    type?: PolicyActionType;

    /**
     * Message id
     */
    @Property({ nullable: true })
    startMessageId?: string;

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
     * Status
     */
    @Property({ nullable: true })
    status?: PolicyActionStatus;

    /**
     * Hedera account id
     */
    @Property({
        nullable: true,
        index: true
    })
    accountId?: string;

    /**
     * Hedera account id
     */
    @Property({ nullable: true })
    sender?: string;

    /**
     * Block Tag
     */
    @Property({
        nullable: true,
        index: true
    })
    blockTag?: string;

    /**
     * Message index
     */
    @Property({
        nullable: true,
        index: true
    })
    index?: number;

    /**
     * Document
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: any;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

    /**
     * Last Status
     */
    @Property({ nullable: true })
    lastStatus?: PolicyActionStatus;

    /**
     * Document loaded
     */
    @Property({ nullable: true })
    loaded?: boolean;

    /**
     * Policy message id
     */
    @Property({ nullable: true })
    policyMessageId?: string;

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
        this.uuid = this.uuid || GenerateUUIDv4();
        this.status = this.status || PolicyActionStatus.NEW;
        this.lastStatus = this.lastStatus || this.status;
        if (this.document) {
            const document = JSON.stringify(this.document);
            this.documentFileId = await this.createFile(document);
            delete this.document;
        }
    }

    /**
     * Create File
     */
    private createFile(json: string) {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                const fileName = `PolicyAction_${this._id?.toString()}_${GenerateUUIDv4()}`;
                const fileStream = DataBaseHelper.gridFS.openUploadStream(fileName);
                const fileId = fileStream.id;
                fileStream.write(json);
                fileStream.end(() => resolve(fileId));
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Load File
     */
    private async loadFile(fileId: ObjectId) {
        const fileStream = DataBaseHelper.gridFS.openDownloadStream(fileId);
        const bufferArray = [];
        for await (const data of fileStream) {
            bufferArray.push(data);
        }
        const buffer = Buffer.concat(bufferArray);
        return buffer.toString();
    }

    /**
     * Load File
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.documentFileId) {
            const buffer = await this.loadFile(this.documentFileId);
            this.document = JSON.parse(buffer);
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.document) {
            const document = JSON.stringify(this.document);
            const documentFileId = await this.createFile(document);
            if (documentFileId) {
                this._documentFileId = this.documentFileId;
                this.documentFileId = documentFileId;
            }
            delete this.document;
        }
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
                    console.error(`AfterUpdate: PolicyAction, ${this._id}, _documentFileId`)
                    console.error(reason)
                });
            delete this._documentFileId;
        }
    }

    /**
     * Delete context
     */
    @AfterDelete()
    deleteDocument() {
        if (this.documentFileId) {
            DataBaseHelper.gridFS
                .delete(this.documentFileId)
                .catch((reason) => {
                    console.error(`AfterDelete: PolicyAction, ${this._id}, documentFileId`)
                    console.error(reason)
                });
        }
    }
}