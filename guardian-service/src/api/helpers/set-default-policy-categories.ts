import { DataBaseHelper, PolicyCategory } from '@guardian/common';
import { PolicyCategoryType } from '@guardian/interfaces';

export async function setDefaultPolicyCategories() {
    await addCategory('Large-Scale', PolicyCategoryType.PROJECT_SCALE);
    await addCategory('Small-Scale', PolicyCategoryType.PROJECT_SCALE);

    await addCategory('Landfill gas', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Grid electricity', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Biomass electricity', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Energy efficiency', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Offgrid electricity/ isolated grids', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Renewable thermal energy', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Captive power', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Cookstove', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Lighting', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Water purifier', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Electricity grid connection', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Manure and comparable animal waste', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Alternative treatment – composting', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);
    await addCategory('Lagoons and biodigester – biogas', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE);

    await addCategory('GHG distruction', PolicyCategoryType.MITIGATION_ACTIVITY_TYPE);
    await addCategory('Renewable energy', PolicyCategoryType.MITIGATION_ACTIVITY_TYPE);
    await addCategory('Energy efficiency', PolicyCategoryType.MITIGATION_ACTIVITY_TYPE);
    await addCategory('Fuel/feedstock switch', PolicyCategoryType.MITIGATION_ACTIVITY_TYPE);
    await addCategory('GHG emission avoidance', PolicyCategoryType.MITIGATION_ACTIVITY_TYPE);

    await addCategory('Electricity generation and supply', PolicyCategoryType.SUB_TYPE);
    await addCategory('Energy for industries', PolicyCategoryType.SUB_TYPE);
    await addCategory('Energy for households and buildings', PolicyCategoryType.SUB_TYPE);

    await addCategory('Waste handling and disposal', PolicyCategoryType.SECTORAL_SCOPE);
    await addCategory('Energy industries', PolicyCategoryType.SECTORAL_SCOPE);
    await addCategory('Energy demand', PolicyCategoryType.SECTORAL_SCOPE);
    await addCategory('Energy distribution', PolicyCategoryType.SECTORAL_SCOPE);
}

async function addCategory(name: string, type: PolicyCategoryType) {
    const categoriesDB = new DataBaseHelper(PolicyCategory);
    const foundElement = await categoriesDB.findOne({ name, type });
    if (!foundElement) {
        await new DataBaseHelper(PolicyCategory).save({ name, type });
    }
}