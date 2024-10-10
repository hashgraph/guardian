import { PolicyCategoryType } from '@guardian/interfaces';

export interface IPolicyCategory {
    id: string;
    name: string;
    type: PolicyCategoryType;
}
