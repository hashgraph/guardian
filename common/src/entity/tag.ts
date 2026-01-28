import { BeforeCreate, Entity, Property, BeforeUpdate, AfterDelete } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { DataBaseHelper } from '../helpers/db-helper.js';
import { DeleteCache } from './delete-cache.js';
import { ObjectId } from '@mikro-orm/mongodb';

/**
 * Tags collection
 */
@Entity()
export class Tag extends RestoreEntity {
    /**
     * Tag id
     */
    @Property()
    uuid?: string;

    /**
     * Tag label
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Tag description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Tag owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Entity
     */
    @Property({ nullable: true })
    entity?: string;

    /**
     * Target ID
     */
    @Property({ nullable: true })
    target?: string;

    /**
     * Target ID (Local)
     */
    @Property({ nullable: true })
    localTarget?: string;

    /**
     * Target ID
     */
    @Property({ nullable: true })
    status?: 'Draft' | 'Published' | 'History';

    /**
     * Operation
     */
    @Property({ nullable: true })
    operation?: 'Create' | 'Delete';

    /**
     * Topic id
     */
    @Property({ nullable: true })
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
     * VC document
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: any;

    /**
     * Document uri
     */
    @Property({ nullable: true })
    uri?: string;

    /**
     * Date
     */
    @Property({ nullable: false })
    date: string;

    /**
     * File id of the original tag (publish flow).
     */
    @Property({ nullable: true })
    contentFileId?: string;

    /**
     * Create document
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument() {
        this.uuid = this.uuid || GenerateUUIDv4();
        this.status = this.status || 'Draft';
        this.operation = this.operation || 'Create';
        this.date = this.date || (new Date()).toISOString();
        const prop: any = {};
        prop.uuid = this.uuid;
        prop.name = this.name;
        prop.description = this.description;
        prop.owner = this.owner;
        prop.entity = this.entity;
        prop.target = this.target;
        prop.localTarget = this.localTarget;
        prop.status = this.status;
        prop.operation = this.operation;
        prop.topicId = this.topicId;
        prop.messageId = this.messageId;
        prop.policyId = this.policyId;
        prop.uri = this.uri;
        prop.date = this.date;
        this._updatePropHash(prop);
        if (this.document) {
            const document = JSON.stringify(this.document);
            this._updateDocHash(document);
        } else {
            this._updateDocHash('');
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
                collection: 'Tag',
            })
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Delete original tag file (publish flow)
     */
    @AfterDelete()
    deleteContentFile() {
        if (this.contentFileId) {
            DataBaseHelper.gridFS
                .delete(new ObjectId(this.contentFileId))
                .catch((reason) => {
                    console.error('AfterDelete: Tag, contentFileId');
                    console.error(reason);
                });
        }
    }
}
