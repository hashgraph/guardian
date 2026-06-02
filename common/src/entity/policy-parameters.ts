import { Entity, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { PolicyEditableFieldDTO } from '@guardian/interfaces';

export type PolicyParameterPropertiesMap = Record<string, Record<string, unknown>>;

/**
 * PolicyParameters collection
 */
@Entity()
@Index({ properties: ['userDID', 'policyId'], options: { unique: true } })
export class PolicyParameters extends BaseEntity {
    /**
     * User DID
     */
    @Property({ nullable: false })
    userDID: string;

    /**
     * Policy ID
     */
    @Property({ nullable: false })
    policyId: string;

    /**
     * Config with values
     */
    @Property({ nullable: true })
    config: PolicyEditableFieldDTO[];

    /**
     * Cache-invalidation flag
     */
    @Property({ nullable: false, default: false })
    updated: boolean = false;

    /**
     * Precomputed overlay map
     */
    @Property({ nullable: true })
    properties?: PolicyParameterPropertiesMap;
}
