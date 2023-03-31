import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * Block state
 */
@Entity()
export class SplitDocuments extends BaseEntity {
    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Block id
     */
    @Property({
        nullable: true,
        index: true
    })
    blockId?: string;

    /**
     * User id
     */
    @Property({
        nullable: true,
        index: true
    })
    userId?: string;

    /**
     * Value
     */
    @Property({ nullable: true })
    value?: any;

    /**
     * Value
     */
    @Property({ nullable: true })
    document?: any;
}
