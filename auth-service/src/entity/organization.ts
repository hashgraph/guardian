import { Entity, Enum, Property } from '@mikro-orm/core';
import { LocationType } from '@guardian/interfaces';
import { BaseEntity } from '@guardian/common';

/**
 * Organization collection
 *
 * Registry-scoped first-class actor: own DID, Hedera wallet, and topic (published under the
 * SR / global topic). Sibling of User in shape.
 *
 * Note: roles are NOT stored on Organization — they live in the OrgRole collection.
 */
@Entity()
export class Organization extends BaseEntity {
    /**
     * Display name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * SR DID that created the organization (the owner)
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Organization DID
     */
    @Property({ nullable: true })
    did?: string;

    /**
     * Wallet token (secret-manager handle for the org's Hedera key)
     */
    @Property({ nullable: true })
    walletToken?: string;

    /**
     * Hedera account id of the organization
     */
    @Property({ nullable: true })
    hederaAccountId?: string;

    /**
     * Organization Hedera topic id (the org's own topic)
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Parent topic id (the SR / global topic this org's topic was linked under)
     */
    @Property({ nullable: true })
    parentTopicId?: string;

    /**
     * Lifecycle status — free-form string for now (e.g. 'DRAFT' | 'PUBLISHED')
     */
    @Property({ nullable: true })
    status?: string;

    /**
     * Location (LOCAL | REMOTE) — same enum used on User
     */
    @Enum({ nullable: true })
    location?: LocationType;
}
