import * as fs from 'fs';
import * as path from 'path';
import { PolicyCategory } from '../models/common/policy-category';
import { GroupCategories } from './general-helper';
import { Policy } from '../models/common/policy';
import { PolicyCategoryType } from '@guardian/interfaces';
import { PolicyDescription } from '../models/models';

const MIN_DESCRIPTION_WORDS = 5;

export class FilesManager {

    static async generateData(dirPath: string, policies: Policy[], categories: PolicyCategory[], policyDescriptions: PolicyDescription[]): Promise<boolean> {
        this.checkDir(dirPath);
        this.deleteAllFilesInDirectory(dirPath);

        try {
            await this.generateMethodologyFiles(dirPath, policies, categories, policyDescriptions);
            await this.generateMetadataFile(dirPath, policies, categories);
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    static async generateMethodologyFiles(dirPath: string, policies: Policy[], categories: PolicyCategory[], policyDescriptions: PolicyDescription[]) {
        if (!policies) {
            return false;
        }

        for (let i = 0; i < policies.length; i++) {
            const policyDescription = policyDescriptions.find((description: PolicyDescription) => description.policyId === policies[i]._id);

            const descriptions = policyDescription?.descriptions?.filter((description: string) => description && FilesManager.wordsCount(description) > MIN_DESCRIPTION_WORDS) ?? [];

            const filePath = this.getFileName(dirPath, policies[i].name);
            const content = this.getFileData(policies[i], categories, descriptions);

            if (content) {
                await this.generateFile(filePath, content);
            }
        }
    }

    static async generateMetadataFile(dirPath: string, policies: Policy[], categories: PolicyCategory[]) {
        const content = this.getMetadataContent(policies, categories);

        if (content) {
            const fileName = `${dirPath}/metadata.txt`;
            await this.generateFile(fileName, content);
        }
    }

    static getMetadataContent(policies: Policy[], categories: PolicyCategory[]) {

        const groupedCategoriesObj: Record<string, PolicyCategory[]> = GroupCategories(categories);
        let content = '';

        Object.keys(groupedCategoriesObj).forEach((type: string) => {
            const categoriesByType = groupedCategoriesObj[type];

            categoriesByType.forEach((category: PolicyCategory, index: number) => {
                const policyNamesByCategory = policies.filter((pol: Policy) => pol.categories?.includes(category.id)).map((pol: Policy) => pol.name);

                if (policyNamesByCategory.length) {
                    if (index === 0) {
                        content += `${this.getNameByCategoryType(type)} \n`;
                    }

                    content += `${category.name}: ${policyNamesByCategory.join(', ')} \n\n`;
                }
            });
        });

        return content;
    }

    static getNameByCategoryType(type: string) {
        switch (type as PolicyCategoryType) {
            case PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE:
                return 'Categorization Methodologies by Applied Technology Type/Measure';
            case PolicyCategoryType.MITIGATION_ACTIVITY_TYPE:
                return 'Categorization Methodologies by Mitigation Activity Type';
            case PolicyCategoryType.PROJECT_SCALE:
                return 'Categorization Methodologies by Scale';
            case PolicyCategoryType.SECTORAL_SCOPE:
                return 'Methodologies Sectoral Scope Name';
            case PolicyCategoryType.SUB_TYPE:
                return 'Categorization Methodologies by Sub Type';
            default:
                return '';
        }
    }

    static deleteAllFilesInDirectory(directoryPath: string) {
        fs.readdirSync(directoryPath).forEach((file) => {
            const filePath = path.join(directoryPath, file);
            fs.unlinkSync(filePath);
        });
    }

    static checkDir(directoryPath: string) {
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath);
        }
    }

    static getFileName(dirPath: string, name: string) {
        return dirPath + '/' + name + '.txt';
    }

    static wordsCount(str) {
        const words = str.split(/\s+/);
        const filteredWords = words.filter(word => word.length > 0);
        return filteredWords.length;
    }

    static getFileData(policy: Policy, categories: PolicyCategory[], descriptions: string[]) {
        let content = '';
        content += policy.typicalProjects ? `\n Typical projects: \n ${policy.typicalProjects}` : '';
        content += policy.applicabilityConditions ? `\n Important conditions under which the methodology is applicable: ${policy.applicabilityConditions} ` : '';
        if (policy.importantParameters && (policy.importantParameters.atValidation || policy.importantParameters.monitored)) {
            content += `\n Important parameters: \n`;
            content += policy.importantParameters.atValidation ? `At validation: \n ${policy.importantParameters?.atValidation} \n` : '';
            content += policy.importantParameters.monitored ? `Monitored: \n ${policy.importantParameters?.monitored} \n` : '';
        }

        content += policy.description ? `\n ${policy.description} \n` : '';

        content += this.getCategoryRowByType(policy, categories, PolicyCategoryType.PROJECT_SCALE, `methodology by scale type`);
        content += this.getCategoryRowByType(policy, categories, PolicyCategoryType.SECTORAL_SCOPE, `by sectoral scope`);
        content += this.getCategoryRowByType(policy, categories, PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE, `by applied technology type`);
        content += this.getCategoryRowByType(policy, categories, PolicyCategoryType.SUB_TYPE, `by subtype`);
        content += this.getCategoryRowByType(policy, categories, PolicyCategoryType.MITIGATION_ACTIVITY_TYPE, `by mitigation activity type`);

        let policyName = policy.topicDescription ? `${policy.name} (${policy.topicDescription})` : policy.name;

        if (descriptions.length) {
            content += '\n';
            descriptions.forEach((description: string) => content += `${description} \n`);
        }

        if (!content) {
            return '';
        } else {
            return 'Methodology name: ' + policyName + '\n' + content;
        }
    }

    static getCategoryRowByType(policy: Policy, categories: PolicyCategory[], type: PolicyCategoryType, text: string): string {
        if (policy.categories?.length) {
            const categoryName = categories.find((ctg: PolicyCategory) => ctg.type === type && policy.categories.includes(ctg.id))?.name;
            if (categoryName) {
                return `\n ${policy.name} ${text}: ${categoryName} \n`;
            }
        }

        return '';
    }

    static async generateFile(filePath: string, content: string) {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, content, (err) => {
                if (err) {
                    console.error(err);
                    reject();
                } else {
                    console.log(`File ${filePath} was created`);
                    resolve(true);
                }
            });
        });
    }
}
