import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Tags collection
 */
@Entity()
export class Tag extends BaseEntity {
    /**
     * Tag id
     */
    @Property()
    uuid?: string;

    /**
     * Tag label
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Tag description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Tag owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Entity
     */
    @Property({ nullable: true })
    entity?: string;

    /**
     * Target ID
     */
    @Property({ nullable: true })
    target?: string;

    /**
     * Target ID (Local)
     */
    @Property({ nullable: true })
    localTarget?: string;

    /**
     * Target ID
     */
    @Property({ nullable: true })
    status?: 'Draft' | 'Published' | 'History';

    /**
     * Operation
     */
    @Property({ nullable: true })
    operation?: 'Create' | 'Delete';

    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * VC document
     */
    @Property({ nullable: true, type: 'unknown' })
    document?: any;

    /**
     * Document uri
     */
    @Property({ nullable: true })
    uri?: string;

    /**
     * Date
     */
    @Property({ nullable: false })
    date: string;

    /**
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
        this.status = this.status || 'Draft';
        this.operation = this.operation || 'Create';
        this.date = this.date || (new Date()).toISOString();
    }
}
