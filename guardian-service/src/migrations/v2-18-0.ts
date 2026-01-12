import { Migration } from '@mikro-orm/migrations-mongodb';
import path from 'node:path';
import * as fs from 'node:fs';
import { PolicyCategoryType } from '@guardian/interfaces';

/**
 * Migration to version 2.17.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.importProperties();
        await this.importCategories();
    }

    /**
     * Import properties
     */
    async importProperties() {
        const propertiesCollection = this.getCollection('policy_property');
        const filePath = path.join(process.cwd(), 'src', 'migrations', 'artifacts', 'policy-properties.csv');
        const data = await fs.promises.readFile(filePath, 'utf8');
        const rows = data.split('\n');

        for (const row of rows) {
            if (row) {
                const columns = row.split(',');
                if (columns.length === 2 && columns[0]) {
                    await propertiesCollection.insertOne({
                        title: columns[0],
                        value: columns[1]
                    });
                }
            }
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
            const foundElement = await categoriesCollection.findOne({ name: category[0] });
            if (!foundElement) {
                await categoriesCollection.insertOne({
                    name: category[0],
                    type: category[1]
                });
            }
        }
    }
}