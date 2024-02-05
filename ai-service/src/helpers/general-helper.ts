import { Policy } from '../models/common/policy';
import { PolicyCategory } from '../models/common/policy-category';
import { Methodology } from '../models/models';

export function GetMehodologiesByPolicies(responseText: string, policies: Array<Policy>) {
    const methodologies: Array<Methodology> = [];

    policies.map((policy) => {

        const reg = new RegExp(`\\b${policy.name}\\b`, 'i');

        if (reg.test(responseText) && !methodologies.find((methodology: Methodology) => methodology.id === policy._id)) {
            methodologies.push({
                id: policy._id,
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
