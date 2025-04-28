import { AfterDelete, BeforeCreate, BeforeUpdate, Entity, OnLoad, Property } from '@mikro-orm/core';
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
     * ID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * ID
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
     * Hedera account id
     */
    @Property({
        nullable: true,
        index: true
    })
    blockTag?: string;

    /**
     * Hedera account id
     */
    @Property({
        nullable: true,
        index: true
    })
    index?: number;

    /**
     * Document instance
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: any;

    /**
     * Document file id
     */
    @Property({ nullable: true })
    documentFileId?: ObjectId;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
        this.status = this.status || PolicyActionStatus.NEW;
    }


    /**
     * Create document
     */
    @BeforeCreate()
    async createDocument() {
        await new Promise<void>((resolve, reject) => {
            try {
                if (this.document) {
                    const fileStream = DataBaseHelper.gridFS.openUploadStream(GenerateUUIDv4());
                    this.documentFileId = fileStream.id;
                    fileStream.write(JSON.stringify(this.document));
                    fileStream.end(() => resolve());
                } else {
                    resolve();
                }
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.document) {
            if (this.documentFileId) {
                DataBaseHelper.gridFS
                    .delete(this.documentFileId)
                    .catch(console.error);
            }
            await this.createDocument();
        }
    }
    /**
     * Load document
     */
    @OnLoad()
    async loadDocument() {
        if (this.documentFileId) {
            const fileStream = DataBaseHelper.gridFS.openDownloadStream(this.documentFileId);
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
}

