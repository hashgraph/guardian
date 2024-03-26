import { PolicyCategory } from '../entity/index.js';
import { DataBaseHelper } from './db-helper.js';

export function GetGroupedCategories(categories: PolicyCategory[]) {
    const groupedCategories = categories.reduce((result, item: PolicyCategory) => {
        if (!result[item.type]) {
            result[item.type] = [];
        }
        result[item.type].push(item.id);
        return result;
    }, {});
    return groupedCategories;
};

export async function GetConditionsPoliciesByCategories(categoryIds: string[], text: string) {
    const conditions: any[] = [{ status: { $eq: 'PUBLISH' } }];

    if (text) {
        conditions.push({ name: { $regex: `.*${text}.*`, $options: 'i' } });
    }

    if (categoryIds?.length) {
        const currentCategories: PolicyCategory[] = await new DataBaseHelper(PolicyCategory).find({
            where: {
                id: { $in: categoryIds },
            }
        });
        const groupedCategories = GetGroupedCategories(currentCategories);
        conditions.push(...Object.keys(groupedCategories).map((categoryKey) => { return { categories: { $in: groupedCategories[categoryKey] } } }));
    }

    return conditions;
};
