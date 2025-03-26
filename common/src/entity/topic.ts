import { TopicType } from '@guardian/interfaces';
import { BeforeCreate, BeforeUpdate, Entity, Property, Enum, Unique, AfterDelete } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/db-helper.js';
import { DeleteCache } from './delete-cache.js';

/**
 * Topics collection
 */
@Entity()
@Unique({ properties: ['topicId'], options: { partialFilterExpression: { topicId: { $type: 'string' } } } })
export class Topic extends RestoreEntity {
    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Topic name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Topic description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Topic owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Topic type
     */
    @Enum()
    type?: TopicType;

    /**
     * Parent
     */
    @Property({ nullable: true })
    parent?: string;

    /**
     * Policy id
     */
    @Property({ nullable: true })
    policyId?: string;

    /**
     * Policy UUID
     */
    @Property({ nullable: true })
    policyUUID?: string;

    /**
     * Target id
     */
    @Property({ nullable: true })
    targetId?: string;

    /**
     * Target UUID
     */
    @Property({ nullable: true })
    targetUUID?: string;

    /**
     * Create document
     */
    @BeforeCreate()
    @BeforeUpdate()
    async createDocument() {
        const prop: any = {};
        prop.topicId = this.topicId;
        prop.name = this.name;
        prop.description = this.description;
        prop.owner = this.owner;
        prop.type = this.type;
        prop.parent = this.parent;
        prop.policyId = this.policyId;
        prop.policyUUID = this.policyUUID;
        prop.targetId = this.targetId;
        prop.targetUUID = this.targetUUID;
        this._updatePropHash(prop);
        this._updateDocHash('');
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
                collection: 'Topic',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
