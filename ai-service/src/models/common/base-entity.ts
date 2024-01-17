import { ObjectId } from '@mikro-orm/mongodb';

/**
 * Base entity with indentifiers
 */
export declare abstract class BaseEntity {
    /**
     * Entity id
     */
    _id: ObjectId;
    /**
     * Entity string id
     */
    id: string;
    /**
     * Created at
     */
    createDate: Date;
    /**
     * Updated at
     */
    updateDate: Date;

    /**
     * Returns object in JSON string
     * @returns {string} String object
     */
    toJSON(): {
        [p: string]: any;
    };

    /**
     * Set base date
     */
    __onBaseCreate(): void;

    /**
     * Set base date
     */
    __onBaseUpdate(): void;
}
