import { PolicyCategoryType } from '@guardian/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.20.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.removeVpHashIndex();
        await this.importCategories();
    }

    /**
     * Remove vp hash index
     */
    async removeVpHashIndex() {
        const vpDocumentCollection = this.getCollection('VpDocument');
        try {
            if (await vpDocumentCollection.indexExists('hash_1')) {
                await vpDocumentCollection.dropIndex('hash_1');
            }
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * Import categories
     */
    async importCategories() {
        const categoriesCollection = this.getCollection('policy_category');
        const categories = [
            ['Large-Scale', PolicyCategoryType.PROJECT_SCALE],
            ['Small-Scale', PolicyCategoryType.PROJECT_SCALE],

            ['Landfill gas', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Grid electricity', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Biomass electricity', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Energy efficiency', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Offgrid electricity/ isolated grids', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Renewable thermal energy', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Captive power', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Cookstove', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Lighting', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Water purifier', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Electricity grid connection', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Manure and comparable animal waste', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Alternative treatment – composting', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],
            ['Lagoons and biodigester – biogas', PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE],

            ['GHG distruction', PolicyCategoryType.MITIGATION_ACTIVITY_TYPE],
            ['Renewable energy', PolicyCategoryType.MITIGATION_ACTIVITY_TYPE],
            ['Energy efficiency', PolicyCategoryType.MITIGATION_ACTIVITY_TYPE],
            ['Fuel/feedstock switch', PolicyCategoryType.MITIGATION_ACTIVITY_TYPE],
            ['GHG emission avoidance', PolicyCategoryType.MITIGATION_ACTIVITY_TYPE],

            ['Electricity generation and supply', PolicyCategoryType.SUB_TYPE],
            ['Energy for industries', PolicyCategoryType.SUB_TYPE],
            ['Energy for households and buildings', PolicyCategoryType.SUB_TYPE],

            ['Waste handling and disposal', PolicyCategoryType.SECTORAL_SCOPE],
            ['Energy industries', PolicyCategoryType.SECTORAL_SCOPE],
            ['Energy demand', PolicyCategoryType.SECTORAL_SCOPE],
            ['Energy distribution', PolicyCategoryType.SECTORAL_SCOPE]
        ];
        for (const category of categories) {
            const foundElement = await categoriesCollection.findOne({ name: category[0], type: category[1] });
            if (!foundElement) {
                await categoriesCollection.insertOne({
                    name: category[0],
                    type: category[1]
                });
            }
        }
    }
}
