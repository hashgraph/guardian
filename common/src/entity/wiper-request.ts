import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

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
