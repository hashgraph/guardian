import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * Block state
 */
@Entity()
export class BlockState extends BaseEntity {
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
     * block state
     */
    @Property({ nullable: true })
    blockState?: string;
}
