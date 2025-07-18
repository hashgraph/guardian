import { BaseEntity } from '../models/index.js';
import { ObjectId } from '@mikro-orm/mongodb';
import {
    Entity,
    Property,
    Index,
    BeforeCreate,
    OnLoad,
    BeforeUpdate,
    AfterDelete,
    AfterUpdate,
    AfterCreate,
} from '@mikro-orm/core';
import { DataBaseHelper } from '../helpers/index.js';

/**
 * Block state
 */
@Entity()
@Index({ name: 'variable_idx', properties: ['policyId', 'blockId', 'name', 'did'] })
export class BlockCache extends BaseEntity {
    /**
     * Policy id
     */
    @Index({ name: 'policy_id' })
    @Property()
    policyId!: string;

    /**
     * Block id
     */
    @Index({ name: 'block_id' })
    @Property()
    blockId!: string;

    /**
     * Variable name
     */
    @Index({ name: 'variable_name' })
    @Property()
    name!: string;

    /**
     * User DID
     */
    @Property({ nullable: true })
    did?: string;

    /**
     * Variable value
     */
    @Property({ nullable: true, type: 'unknown' })
    value?: any;

    /**
     * If long value
     */
    @Property({ nullable: true })
    isLongValue?: boolean;

    /**
     * File id (long value)
     */
    @Property({ nullable: true })
    fileId?: ObjectId;

    /**
     * old file id
     */
    @Property({ persist: false, nullable: true })
    _fileId?: ObjectId;

    /**
     * Set defaults
     */
    @BeforeCreate()
    async setDefaults() {
        if (this.isLongValue && this.value) {
            const value = JSON.stringify(this.value);
            this.fileId = await this._createFile(value, 'BlockCache');
            delete this.value;
        }
    }

    /**
     * Load File
     */
    @OnLoad()
    @AfterUpdate()
    @AfterCreate()
    async loadFiles() {
        if (this.fileId && !this.value) {
            const buffer = await this._loadFile(this.fileId);
            this.value = JSON.parse(buffer.toString());
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateFiles() {
        if (this.value) {
            if (this.isLongValue) {
                const value = JSON.stringify(this.value);
                const fileId = await this._createFile(value, 'BlockCache');
                if (fileId) {
                    this._fileId = this.fileId;
                    this.fileId = fileId;
                }
                delete this.value;
            } else {
                this._fileId = this.fileId;
            }
        }
    }

    /**
     * Delete File
     */
    @AfterUpdate()
    postUpdateFiles() {
        if (this._fileId) {
            DataBaseHelper.gridFS
                .delete(this._fileId)
                .catch((reason) => {
                    console.error(`AfterUpdate: BlockCache, ${this._id}, _fileId`)
                    console.error(reason)
                });
            delete this._fileId;
        }
    }

    /**
     * Delete context
     */
    @AfterDelete()
    deleteFiles() {
        if (this.fileId) {
            DataBaseHelper.gridFS
                .delete(this.fileId)
                .catch((reason) => {
                    console.error(`AfterDelete: BlockCache, ${this._id}, fileId`)
                    console.error(reason)
                });
        }
    }
}
