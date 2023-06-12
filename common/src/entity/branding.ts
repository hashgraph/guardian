import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';

/**
 * Branding
 */
@Entity()
export class Branding extends BaseEntity {
    /**
     * Branding JSON
     */
    @Property({ nullable: true })
    config?: string;
}
