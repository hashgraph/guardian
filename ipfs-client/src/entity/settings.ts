import { BaseEntity } from '@guardian/common';
import { Entity, Property, Unique } from '@mikro-orm/core';

/**
 * Service settings
 */
@Entity()
@Unique({ properties: ['name'], options: { partialFilterExpression: { name: { $type: 'string' }}}})
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
