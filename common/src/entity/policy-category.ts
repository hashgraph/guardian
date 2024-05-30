import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models/index.js';
import { PolicyCategoryType } from '@guardian/interfaces';

/**
 * PolicyCategory collection
 */
@Entity()
export class PolicyCategory extends BaseEntity {
    /**
     * Policy Category Name
     */
    @Property({ nullable: false })
    name: string;

    /**
     * Policy Category Name
     */
    @Property({ nullable: false })
    type: PolicyCategoryType;
}
