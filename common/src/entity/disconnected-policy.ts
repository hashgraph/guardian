import { Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';

/**
 * Disconnected policy
 */
@Entity()
@Index({
    properties: ['policyId', 'owner'],
    name: 'user_index'
})
export class DisconnectedPolicy extends BaseEntity {
    /**
     * PolicyID
     */
    @Property({ nullable: true })
    policyId: string;

    /**
     * User DID
     */
    @Property({ nullable: true })
    owner?: string;
}