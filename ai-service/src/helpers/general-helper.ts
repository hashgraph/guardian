import { Methodology } from '../models/models.js';
import { Policy, PolicyCategory } from '@guardian/common';

export function GetMehodologiesByPolicies(responseText: string, policies: Policy[]) {
    const methodologies: Methodology[] = [];

    policies.map((policy) => {

        const reg = new RegExp(`\\b${policy.name}\\b`, 'i');

        if (reg.test(responseText) && !methodologies.find((methodology: Methodology) => methodology.id === policy._id.toString())) {
            methodologies.push({
                id: policy._id.toString(),
                label: policy.name,
                text: policy.topicDescription ?? '',
                url: policy.detailsUrl ?? ''
            });
        }
    });

    return methodologies;
}

export function GroupCategories(categories: PolicyCategory[]): Record<string, PolicyCategory[]> {
    const groupedCategories = categories.reduce((result, item: PolicyCategory) => {
        if (!result[item.type]) {
            result[item.type] = [];
        }

        result[item.type].push(item);
        return result;
    }, {});

    return groupedCategories;
}
