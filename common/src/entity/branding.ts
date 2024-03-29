import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

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
