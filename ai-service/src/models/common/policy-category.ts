import { PolicyCategoryType } from '@guardian/interfaces';
import { BaseEntity } from '@guardian/common';

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
