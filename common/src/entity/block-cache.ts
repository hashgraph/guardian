import { GenerateUUIDv4 } from '@guardian/interfaces';
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
            this.fileId = await this.createFile(value);
            delete this.value;
        }
    }

    /**
     * Create File
     */
    private createFile(json: string) {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                const fileName = `BlockCache_${this._id?.toString()}_${GenerateUUIDv4()}`;
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
        if (this.fileId && !this.value) {
            const buffer = await this.loadFile(this.fileId);
            this.value = JSON.parse(buffer);
        }
    }

    /**
     * Update document
     */
    @BeforeUpdate()
    async updateDocument() {
        if (this.value) {
            if (this.isLongValue) {
                const value = JSON.stringify(this.value);
                const fileId = await this.createFile(value);
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
    deleteDocument() {
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
