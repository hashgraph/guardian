import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Tag Cache
 */
@Entity()
export class TagCache extends BaseEntity {
    /**
     * Target ID (Local)
     */
    @Property({ nullable: false })
    localTarget: string;

    /**
     * Entity
     */
    @Property({ nullable: false })
    entity: string;

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
        this.date = this.date || (new Date()).toISOString();
    }
}