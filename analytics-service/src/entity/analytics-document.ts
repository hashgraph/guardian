import { BeforeCreate, Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';
import { DocumentType } from '../interfaces/document.type';

/**
 * Report collection
 */
@Entity()
@Unique({ properties: ['uuid'], options: { partialFilterExpression: { did: { $type: 'string' } } } })
export class AnalyticsDocument extends BaseEntity {
    /**
     * Report UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Topic ID
     */
    @Property({ nullable: true })
    root?: string;

    /**
     * Message timeStamp
     */
    @Property({ nullable: true })
    timeStamp?: string;

    /**
     * Message payer
     */
    @Property({ nullable: true })
    account?: string;

    /**
     * Document type
     */
    @Property({ nullable: true })
    type?: string;

    /**
     * Document type
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Document schema
     */
    @Property({ nullable: true })
    schema?: string;

    /**
     * Policy uuid
     */
    @Property({ nullable: true })
    policyUUID?: string;

    /**
     * Instance Topic ID
     */
    @Property({ nullable: true })
    instanceTopicId?: string;

    /**
     * Role
     */
    @Property({ nullable: true })
    role?: string;

    /**
     * Group
     */
    @Property({ nullable: true })
    group?: string;

    /**
     * Set defaults
     */
    @BeforeCreate()
    setInitState() {
        this.type = this.type || DocumentType.NONE;
    }
}
