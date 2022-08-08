import { PrimaryKey, SerializedPrimaryKey } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

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
     * Returns object in JSON string
     * @returns {string} String object
     */
     toJSON(): { [p: string]: any } {
        return Object.assign({}, { ...this, id: this.id });
    }
}