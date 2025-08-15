import { BeforeCreate, BeforeUpdate, PrimaryKey, Property, SerializedPrimaryKey } from '@mikro-orm/core';
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
}
