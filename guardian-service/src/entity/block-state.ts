import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

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
    @Property({ nullable: true })
    policyId?: string;

    /**
     * Block id
     */
    @Property({ nullable: true })
    blockId?: string;

    /**
     * block state
     */
    @Property({ nullable: true })
    blockState?: string;

    toJSON(): { [p: string]: any } {
        return Object.assign({}, { ...this, id: this.id });
    }
}
