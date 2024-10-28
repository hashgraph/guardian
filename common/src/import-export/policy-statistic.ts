import JSZip from 'jszip';
import { PolicyStatistic } from '../entity/index.js';
import { IFormulaData, IRuleData, IScoreData, IScoreOption, IStatisticConfig, IVariableData } from '@guardian/interfaces';

/**
 * PolicyStatistic components
 */
export interface IPolicyStatisticComponents {
    definition: PolicyStatistic;
}

/**
 * PolicyStatistic import export
 */
export class PolicyStatisticImportExport {
    /**
     * PolicyStatistic filename
     */
    public static readonly policyStatisticFileName = 'statistic.json';

    /**
     * Load PolicyStatistic components
     * @param definition PolicyStatistic
     *
     * @returns components
     */
    public static async loadPolicyStatisticComponents(definition: PolicyStatistic): Promise<IPolicyStatisticComponents> {
        return { definition };
    }

    /**
     * Generate Zip File
     * @param definition PolicyStatistic
     *
     * @returns Zip file
     */
    public static async generate(definition: PolicyStatistic): Promise<JSZip> {
        const components = await PolicyStatisticImportExport.loadPolicyStatisticComponents(definition);
        const file = await PolicyStatisticImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components PolicyStatistic components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: IPolicyStatisticComponents): Promise<JSZip> {
        const object = { ...components.definition };
        delete object.id;
        delete object._id;
        delete object.owner;
        delete object.createDate;
        delete object.updateDate;
        const zip = new JSZip();
        zip.file(PolicyStatisticImportExport.policyStatisticFileName, JSON.stringify(object));
        return zip;
    }

    /**
     * Parse zip PolicyStatistic file
     * @param zipFile Zip file
     * @returns Parsed PolicyStatistic
     */
    public static async parseZipFile(zipFile: any): Promise<IPolicyStatisticComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (
            !content.files[PolicyStatisticImportExport.policyStatisticFileName] ||
            content.files[PolicyStatisticImportExport.policyStatisticFileName].dir
        ) {
            throw new Error('Zip file is not a policy statistic');
        }
        const definitionString = await content.files[PolicyStatisticImportExport.policyStatisticFileName].async('string');
        const definition = JSON.parse(definitionString);
        return { definition };
    }

    /**
     * Validate Config
     *
     * @param data config
     */
    public static validateConfig(data?: IStatisticConfig): IStatisticConfig {
        const config: IStatisticConfig = {
            variables: PolicyStatisticImportExport.validateVariables(data?.variables),
            scores: PolicyStatisticImportExport.validateScores(data?.scores),
            formulas: PolicyStatisticImportExport.validateFormulas(data?.formulas),
            rules: PolicyStatisticImportExport.validateRules(data?.rules),
        }
        return config;
    }

    /**
     * Validate Variables
     *
     * @param data Variables
     */
    private static validateVariables(data?: IVariableData[]): IVariableData[] {
        const variables: IVariableData[] = [];
        if (Array.isArray(data)) {
            for (const variable of data) {
                variables.push(PolicyStatisticImportExport.validateVariable(variable));
            }
        }
        return variables;
    }

    /**
     * Validate Variable
     *
     * @param data Variable
     */
    private static validateVariable(data?: IVariableData): IVariableData {
        const variable: IVariableData = {
            id: PolicyStatisticImportExport.validateString(data.id),
            schemaId: PolicyStatisticImportExport.validateString(data.schemaId),
            path: PolicyStatisticImportExport.validateString(data.path),
            schemaName: PolicyStatisticImportExport.validateString(data.schemaName),
            schemaPath: PolicyStatisticImportExport.validateString(data.schemaPath),
            fieldType: PolicyStatisticImportExport.validateString(data.fieldType),
            fieldRef: PolicyStatisticImportExport.validateBoolean(data.fieldRef),
            fieldArray: PolicyStatisticImportExport.validateBoolean(data.fieldArray),
            fieldDescription: PolicyStatisticImportExport.validateString(data.fieldDescription),
            fieldProperty: PolicyStatisticImportExport.validateString(data.fieldProperty),
            fieldPropertyName: PolicyStatisticImportExport.validateString(data.fieldPropertyName),
        };
        return variable;
    }

    /**
     * Validate Scores
     *
     * @param data Scores
     */
    private static validateScores(data?: IScoreData[]): IScoreData[] {
        const scores: IScoreData[] = [];
        if (Array.isArray(data)) {
            for (const score of data) {
                scores.push(PolicyStatisticImportExport.validateScore(score));
            }
        }
        return scores;
    }

    /**
     * Validate Score
     *
     * @param data Score
     */
    private static validateScore(data?: IScoreData): IScoreData {
        const score: IScoreData = {
            id: PolicyStatisticImportExport.validateString(data.id),
            type: PolicyStatisticImportExport.validateString(data.type),
            description: PolicyStatisticImportExport.validateString(data.description),
            relationships: PolicyStatisticImportExport.validateStrings(data.relationships),
            options: PolicyStatisticImportExport.validateScoreOptions(data.options)
        }
        return score;
    }

    /**
     * Validate Formulas
     *
     * @param data Formulas
     */
    private static validateFormulas(data?: IFormulaData[]): IFormulaData[] {
        const formulas: IFormulaData[] = [];
        if (Array.isArray(data)) {
            for (const formula of data) {
                formulas.push(PolicyStatisticImportExport.validateFormula(formula));
            }
        }
        return formulas;
    }

    /**
     * Validate Formula
     *
     * @param data Formula
     */
    private static validateFormula(data?: IFormulaData): IFormulaData {
        const formula: IFormulaData = {
            id: PolicyStatisticImportExport.validateString(data.id),
            type: PolicyStatisticImportExport.validateString(data.type),
            description: PolicyStatisticImportExport.validateString(data.description),
            formula: PolicyStatisticImportExport.validateString(data.formula),
        }
        return formula;
    }

    /**
     * Validate Rules
     *
     * @param data Rules
     */
    private static validateRules(data?: IRuleData[]): IRuleData[] {
        const rules: IRuleData[] = [];
        if (Array.isArray(data)) {
            for (const rule of data) {
                rules.push(PolicyStatisticImportExport.validateRule(rule));
            }
        }
        return rules;
    }

    /**
     * Validate Rule
     *
     * @param data Rule
     */
    private static validateRule(data?: IRuleData): IRuleData {
        const rule: IRuleData = {
            schemaId: PolicyStatisticImportExport.validateString(data.schemaId),
            type: PolicyStatisticImportExport.validateString(data.type) as any,
            unique: PolicyStatisticImportExport.validateBoolean(data.unique)
        }
        return rule;
    }

    /**
     * Validate ScoreOptions
     *
     * @param data ScoreOptions
     */
    private static validateScoreOptions(data: IScoreOption[]): IScoreOption[] {
        const options: IScoreOption[] = [];
        if (Array.isArray(data)) {
            for (const option of data) {
                options.push(PolicyStatisticImportExport.validateScoreOption(option));
            }
        }
        return options;
    }

    /**
     * Validate ScoreOption
     *
     * @param data ScoreOption
     */
    private static validateScoreOption(data: IScoreOption): IScoreOption {
        const formula: IScoreOption = {
            description: PolicyStatisticImportExport.validateString(data.description),
            value: PolicyStatisticImportExport.validateStringOrNumber(data.value)
        }
        return formula;
    }

    /**
     * Validate Boolean
     *
     * @param data Boolean
     */
    private static validateBoolean(data: string | boolean): boolean {
        return data === 'true' || data === true;
    }

    /**
     * Validate Strings
     *
     * @param data Strings
     */
    private static validateStrings(data?: string[]): string[] {
        const items: string[] = [];
        if (Array.isArray(data)) {
            for (const item of data) {
                items.push(PolicyStatisticImportExport.validateString(item));
            }
        }
        return items;
    }

    /**
     * Validate String
     *
     * @param data String
     */
    private static validateString(data: string): string {
        if (typeof data === 'string') {
            return data;
        } else {
            return '';
        }
    }

    /**
     * Validate StringOrNumber
     *
     * @param data StringOrNumber
     */
    private static validateStringOrNumber(data: string | number): string | number {
        if (typeof data === 'string') {
            return data;
        } else if (typeof data === 'number') {
            return data;
        } else {
            return '';
        }
    }
}
