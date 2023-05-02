import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * Theme collection
 */
@Entity()
export class Theme extends BaseEntity {
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
     * Rules
     */
    @Property({ nullable: true, type: 'unknown' })
    rules?: any;

    /**
     * Set policy defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.uuid = this.uuid || GenerateUUIDv4();
    }
}
