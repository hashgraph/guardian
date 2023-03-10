import { BeforeCreate, Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Tags collection
 */
@Entity()
@Unique({ properties: ['uuid'], options: { partialFilterExpression: { uuid: { $type: 'string' } } } })
export class Tags extends BaseEntity {
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
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
    }
}
