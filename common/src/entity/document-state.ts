import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * Document state
 */
@Entity()
export class DocumentState extends BaseEntity {
    /**
     * Created at
     */
    @Property()
    created: Date = new Date();

    /**
     * Document id
     */
    @Property({ nullable: true })
    documentId?: string;

    /**
     * Document
     */
    @Property({ nullable: true })
    document?: any;
}
