import { Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * Block state
 */
@Entity()
@Index({ name: 'variable_idx', properties: ['policyId', 'blockId', 'name', 'user'] })
export class BlockCache extends BaseEntity {
    /**
     * Policy id
     */
    @Index({ name: 'policy_id' })
    @Property()
    policyId!: string;

    /**
     * Block id
     */
    @Index({ name: 'block_id' })
    @Property()
    blockId!: string;

    /**
     * Variable name
     */
    @Index({ name: 'variable_name' })
    @Property()
    name!: string;

    /**
     * User DID
     */
    @Property({ nullable: true })
    user?: string;

    /**
     * Variable name
     */
    @Property({ nullable: true, type: 'unknown' })
    value?: string;
}
