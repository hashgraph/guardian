import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';

/**
 * Block state
 */
@Entity()
export class DeleteCache extends BaseEntity {
    /**
     * PolicyID
     */
    @Property({ nullable: true })
    policyId: string;

    /**
     * File ID
     */
    @Property({ nullable: true })
    rowId?: string;

    /**
     * Collection Name
     */
    @Property({ nullable: true })
    collection?: string;
}