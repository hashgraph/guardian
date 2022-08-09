import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Settings collection
 */
@Entity()
@Unique({ properties: ['name'], options: { partialFilterExpression: { name: { $exists: true, $ne: null }}}})
export class Settings extends BaseEntity {
    /**
     * Setting name
     */
    @Property({ nullable: true })
    name?: string;

    /**
     * Setting value
     */
    @Property({ nullable: true })
    value?: string;
}
