
import { BaseEntity } from '../models/index.js';
import { GenerateUUIDv4, IStatistic, IVC } from '@guardian/interfaces';
import { Entity, Property, BeforeCreate, OnLoad, BeforeUpdate, AfterDelete, AfterUpdate, AfterCreate } from '@mikro-orm/core';
import { DataBaseHelper } from '../helpers/index.js';
import { ObjectId } from '@mikro-orm/mongodb';

/**
 * PolicyStatistic collection
 */
@Entity()
export class PolicyLabelDocument extends BaseEntity implements IStatistic {
    /**
     * ID
     */
    @Property({ nullable: true })
    uuid?: string;

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
    @Property({
        nullable: true,
        index: true
    })
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
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Policy Topic id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyTopicId?: string;

    /**
     * Policy Instance Topic id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyInstanceTopicId?: string;

    /**
     * Statistic id
     */
    @Property({
        nullable: true,
        index: true
    })
    definitionId?: string;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Message id
     */
    @Property({ nullable: true })
    target?: string;

    /**
     * Message id
     */
    @Property({ nullable: true })
    relationships?: string[];

    /**
     * Document instance
     */
    @Property({ persist: false, type: 'unknown' })
    document?: IVC;

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
    }

    /**
     * Create document
     */
    @BeforeCreate()
    async createDocument() {
        await new Promise<void>((resolve, reject) => {
            try {
                if (this.document) {
                    const fileStream = DataBaseHelper.gridFS.openUploadStream(
                        GenerateUUIDv4()
                    );
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
}
