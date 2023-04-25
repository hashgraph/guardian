import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * Settings collection
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
