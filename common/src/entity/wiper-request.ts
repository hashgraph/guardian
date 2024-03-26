import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';

/**
 * Wiper request
 */
@Entity()
export class WiperRequest extends BaseEntity {
    /**
     * Hedera Contract Id
     */
    @Property()
    contractId: string;

    /**
     * User
     */
    @Property()
    user: string;
}
