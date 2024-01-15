import { PolicyCategoryType } from '../interfaces/policy-category-type';
import { BaseEntity } from './base-entity';

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
