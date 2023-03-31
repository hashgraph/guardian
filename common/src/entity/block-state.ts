import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * Block state
 */
@Entity()
export class BlockState extends BaseEntity {
    /**
     * Created at
     */
    @Property()
    created: Date = new Date();

    /**
     * Updated at
     */
    @Property({ onUpdate: () => new Date() })
    updated: Date = new Date();

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
