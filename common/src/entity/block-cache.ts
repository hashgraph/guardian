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
     * Create row
     */
    @BeforeCreate()
    async createRow() {
        await new Promise<void>((resolve, reject) => {
            try {
                if (this.isLongValue && this.value) {
                    const fileStream = DataBaseHelper.gridFS.openUploadStream(GenerateUUIDv4());
                    this.fileId = fileStream.id;
                    const file = JSON.stringify(this.value);
                    this.value = null;
                    fileStream.write(file);
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
     * Update row
     */
    @BeforeUpdate()
    async updateRow() {
        if (this.fileId) {
            DataBaseHelper.gridFS
                .delete(this.fileId)
                .catch(console.error);
            this.fileId = null;
        }
        if (this.isLongValue && this.value) {
            await this.createRow();
        }
    }

    /**
     * Load row
     */
    @OnLoad()
    async loadRow() {
        if (this.fileId && !this.value) {
            const fileStream = DataBaseHelper.gridFS.openDownloadStream(this.fileId);
            const bufferArray = [];
            for await (const data of fileStream) {
                bufferArray.push(data);
            }
            const buffer = Buffer.concat(bufferArray);
            this.value = JSON.parse(buffer.toString());
        }
    }

    /**
     * Delete row
     */
    @AfterDelete()
    deleteRow() {
        if (this.fileId) {
            DataBaseHelper.gridFS
                .delete(this.fileId)
                .catch(console.error);
            this.fileId = null;
        }
    }
}
