import { PolicyCategoryType } from '../interfaces/policy-category-type.js';
import { BaseEntity } from './base-entity.js';

/**
 * PolicyCategory collection
 */
export declare class PolicyCategory extends BaseEntity {
    /**
     * Policy Category Name
     */
    name: string;
    /**
     * Policy Category Name
     */
    type: PolicyCategoryType;
}
