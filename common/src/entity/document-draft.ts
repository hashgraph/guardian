import { Entity, Property, AfterDelete, BeforeCreate, BeforeUpdate, AfterUpdate } from '@mikro-orm/core';
import { RestoreEntity } from '../models/index.js';
import { DataBaseHelper, extractTableFileIds } from '../helpers/index.js';
import { DeleteCache } from './delete-cache.js';
import { ObjectId } from '@mikro-orm/mongodb';

/**
 * Document draft
 */
@Entity()
export class DocumentDraft extends RestoreEntity {
    /**
     * Document draft id
     */
    @Property()
    uuid?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: false,
    })
    policyId: string;

    /**
     * Block id
     */
    @Property({
        nullable: false,
    })
    blockId: string;

    /**
     * Block tag
     */
    @Property({
        nullable: true,
    })
    blockTag?: string;

    /**
     * User id
     */
    @Property({
        nullable: false,
    })
    userId: string;

    /**
     * Data
     */
    @Property({
        nullable: false,
    })
    data: string;

    /**
     * Table File Ids
     */
    @Property({ nullable: true })
    tableFileIds?: ObjectId[];

    /**
     * Old Table File Ids
     */
    @Property({ persist: false, nullable: true })
    _oldTableFileIds?: ObjectId[];

    @BeforeCreate()
    async setDefaults() {
        try {
            const parsed = JSON.parse(this.data);
            this.tableFileIds = extractTableFileIds(parsed);
        } catch {
            this.tableFileIds = undefined;
        }
    }

    @BeforeUpdate()
    async updateFiles() {
        if (this.data.trim()) {
            try {
                const parsed = JSON.parse(this.data);
                const nextTableFileIds = extractTableFileIds(parsed) || [];
                const currentTableFileIds = this.tableFileIds || [];

                const removedTableFileIds = currentTableFileIds.filter((existingId) => {
                    const existing = String(existingId);
                    return !nextTableFileIds.some((nextId) => String(nextId) === existing);
                });

                this._oldTableFileIds = removedTableFileIds.length ? removedTableFileIds : undefined;
                this.tableFileIds = nextTableFileIds;
            } catch {
                if (this.tableFileIds && this.tableFileIds.length) {
                    this._oldTableFileIds = this.tableFileIds;
                }
                this.tableFileIds = undefined;
            }
        } else {
            if (this.tableFileIds && this.tableFileIds.length) {
                this._oldTableFileIds = this.tableFileIds;
            }
            this.tableFileIds = undefined;
        }
    }

    @AfterUpdate()
    postUpdateFiles() {
        if (this._oldTableFileIds && this._oldTableFileIds.length) {
            for (const fileId of this._oldTableFileIds) {
                DataBaseHelper.gridFS
                    .delete(fileId)
                    .catch((reason) => {
                        console.error(`AfterUpdate: DocumentDraft, ${this._id}, _oldTableFileIds`);
                        console.error(reason);
                    });
            }
            delete this._oldTableFileIds;
        }
    }

    @AfterDelete()
    deleteFiles() {
        if (this.tableFileIds && this.tableFileIds.length) {
            for (const fileId of this.tableFileIds) {
                DataBaseHelper.gridFS
                    .delete(fileId)
                    .catch((reason) => {
                        console.error(`AfterDelete: DocumentDraft, ${this._id}, tableFileIds`);
                        console.error(reason);
                    });
            }
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
                collection: 'DocumentDraft',
            })
        } catch (error) {
            console.error(error);
        }
    }
}
