import { BaseEntity } from '@guardian/common';
import { GenerateUUIDv4, PolicyType } from '@guardian/interfaces';
import { BeforeCreate, Entity, Property, Unique } from '@mikro-orm/core';

/**
 * PolicyModule collection
 */
@Entity()
export class PolicyModule extends BaseEntity {

    /**
     * Module UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Module name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Module description
     */
    @Property({ nullable: true })
    description?: string;

    /**
     * Module config
     */
    @Property({ nullable: true })
    config?: any;

    /**
     * Module status
     */
    @Property({ nullable: true })
    status?: PolicyType;

    /**
     * Module creator
     */
    @Property({ nullable: true })
    creator?: string;

    /**
     * Module owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Module topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Module message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Module code version
     */
    @Property({ nullable: true })
    codeVersion?: string;

    /**
     * Created at
     */
    @Property()
    createDate: Date = new Date();

    /**
     * Type
     */
    @Property({ nullable: true })
    type?: string;

    /**
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || PolicyType.DRAFT;
        this.uuid = this.uuid || GenerateUUIDv4();
        this.codeVersion = this.codeVersion || '1.0.0';
        this.type = this.type || 'CUSTOM';
    }
}
