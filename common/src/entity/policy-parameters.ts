import { Entity, Property} from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { PolicyEditableFieldDTO } from '@guardian/interfaces';

/**
 * PolicyParameters collection
 */
@Entity()
export class PolicyParameters extends BaseEntity {
    /**
     * User ID
     */
    @Property({ nullable: false })
    userDID: string;

    /**
     * Policy ID
     */
    @Property({ nullable: false })
    policyId: string;

    /**
     * Config with value
     */
    @Property({ nullable: true })
    config: PolicyEditableFieldDTO[];

    /**
     * Updated flag
     */
    @Property({ nullable: false })
    updated: boolean;

    /**
     * Config with value
     */
    @Property({ nullable: true })
    properties?: any;
}
