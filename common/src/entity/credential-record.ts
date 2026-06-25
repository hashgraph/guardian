import { Entity, Property, Enum, Unique, Index } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { IntegrationType } from '@guardian/interfaces';

/**
 * Credential record entity
 * Stores metadata for user-managed credentials. Secret values are stored in Wallet.
 */
@Entity()
@Unique({
    properties: ['ownerId', 'serviceType', 'policyId', 'dryRun'],
    options: {
        partialFilterExpression: {
            ownerId: { $type: 'string' },
            serviceType: { $type: 'string' },
        }
    }
})
export class CredentialRecord extends BaseEntity {
    /**
     * DID of the user or SR who owns this credential
     */
    @Property({ nullable: false })
    @Index()
    ownerId!: string;

    /**
     * External service this credential authenticates
     */
    @Enum({ nullable: false })
    serviceType!: IntegrationType;

    /**
     * Policy identifier. Null means global (applies to all policies).
     */
    @Property({ nullable: true })
    @Index()
    policyId?: string;

    /**
     * True if this credential is for dry-run mode, false for production.
     */
    @Property({ nullable: false, default: false })
    dryRun: boolean = false;
}
