import { PrimaryKey, SerializedPrimaryKey } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

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
}