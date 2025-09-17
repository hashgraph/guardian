
import { BaseEntity } from '../models/index.js';
import { Entity, Property, Unique } from '@mikro-orm/core';

/**
 * PolicyDiscussion collection
 */
@Entity()
@Unique({ name: 'unique_uuid_idx', properties: ['documentId', 'uuid'] })
export class PolicyDiscussion extends BaseEntity {
    /**
     * ID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Owner
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Creator
     */
    @Property({
        nullable: true,
        index: true
    })
    creator?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Document id
     */
    @Property({
        nullable: true,
        index: true
    })
    documentId?: string;

    /**
     * Name
     */
    @Property({
        nullable: true
    })
    name?: string;

    /**
     * Relationships
     */
    @Property({
        nullable: true
    })
    relationships?: string[];

    /**
     * Relationships
     */
    @Property({
        nullable: true,
        index: true
    })
    documentIds?: string[];

    /**
     * Count
     */
    @Property({
        nullable: true
    })
    count?: number;

    /**
     * System
     */
    @Property({
        nullable: true,
        index: true
    })
    system?: boolean;

    /**
     * Parent chat
     */
    @Property({
        nullable: true
    })
    parent?: string;

    /**
     * Parent chat
     */
    @Property({
        nullable: true,
        index: true
    })
    field?: string;
}
