import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * Document state
 */
@Entity()
export class DocumentState extends BaseEntity {
    /**
     * Document id
     */
    @Property({ nullable: true })
    documentId?: string;

    /**
     * Document
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: any;
}
