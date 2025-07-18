import { BeforeCreate, BeforeUpdate, PrimaryKey, Property, SerializedPrimaryKey } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../helpers/db-helper.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';

/**
 * Base entity with indentifiers
 */
export abstract class BaseEntity {
    /**
     * Entity id
     */
    @PrimaryKey()
    _id!: ObjectId;

    /**
     * Entity string id
     */
    @SerializedPrimaryKey()
    id!: string;

    /**
     * Created at
     */
    @Property({
        index: true,
        nullable: true,
        type: 'unknown'
    })
    createDate: Date = new Date();

    /**
     * Updated at
     */
    @Property({ nullable: true, type: 'unknown' })
    updateDate: Date = new Date();

    /**
     * Returns object in JSON string
     * @returns {string} String object
     */
    toJSON(): { [p: string]: any } {
        return Object.assign({}, { ...this, id: this.id });
    }

    /**
     * Set base date
     */
    @BeforeCreate()
    __onBaseCreate() {
        this.createDate = new Date();
        this.updateDate = this.createDate;
    }

    /**
     * Set base date
     */
    @BeforeUpdate()
    __onBaseUpdate() {
        this.updateDate = new Date();
    }

    /**
     * Create File
     */
    protected _createFile(json: string | Buffer, name: string): Promise<ObjectId> {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                const fileName = `${name}_${this._id?.toString()}_${GenerateUUIDv4()}`;
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
    protected async _loadFile(fileId: ObjectId): Promise<Buffer> {
        const fileStream = DataBaseHelper.gridFS.openDownloadStream(fileId);
        const bufferArray = [];
        for await (const data of fileStream) {
            bufferArray.push(data);
        }
        const buffer = Buffer.concat(bufferArray);
        return buffer;
    }

    protected _createFieldCache(document: any, fields: string[]): any {
        if (fields) {
            const newDocument: any = {};
            for (const field of fields) {
                const fieldValue = ObjGet(document, field)
                if (
                    typeof fieldValue === 'number' ||
                    (
                        typeof fieldValue === 'string' &&
                        fieldValue.length < (+process.env.DOCUMENT_CACHE_FIELD_LIMIT || 100)
                    )
                ) {
                    ObjSet(newDocument, field, fieldValue);
                }
            }
            return newDocument;
        } else {
            return null;
        }
    }
}
