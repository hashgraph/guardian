import JSZip from 'jszip';
import { PolicyLabel } from '../entity/index.js';
import {
    IConditionElseData,
    IConditionEnum,
    IConditionFormula,
    IConditionIfData,
    IConditionRange,
    IConditionRuleData,
    IConditionText,
    IFormulaRuleData,
    IRangeRuleData,
    ISchemaRuleData,
    IPolicyLabelConfig,
    IVariableData,
    IScoreData,
    IFormulaData,
    IScoreOption
} from '@guardian/interfaces';

/**
 * PolicyLabel components
 */
export interface IPolicyLabelComponents {
    label: PolicyLabel;
}

/**
 * SchemaRule import export
 */
export class PolicyLabelImportExport {
    /**
     * SchemaRule filename
     */
    public static readonly fileName = 'labels.json';

    /**
     * Load SchemaRule components
     * @param rule SchemaRule
     *
     * @returns components
     */
    public static async loadSchemaRuleComponents(label: PolicyLabel): Promise<IPolicyLabelComponents> {
        return { label };
    }

    /**
     * Generate Zip File
     * @param rule rule to pack
     *
     * @returns Zip file
     */
    public static async generate(rule: PolicyLabel): Promise<JSZip> {
        const components = await PolicyLabelImportExport.loadSchemaRuleComponents(rule);
        const file = await PolicyLabelImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components rule components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: IPolicyLabelComponents): Promise<JSZip> {
        const object = { ...components.label };
        delete object.id;
        delete object._id;
        delete object.owner;
        delete object.createDate;
        delete object.updateDate;
        const zip = new JSZip();
        zip.file(PolicyLabelImportExport.fileName, JSON.stringify(object));
        return zip;
    }

    /**
     * Parse zip rule file
     * @param zipFile Zip file
     * @returns Parsed rule
     */
    public static async parseZipFile(zipFile: any): Promise<IPolicyLabelComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (
            !content.files[PolicyLabelImportExport.fileName] ||
            content.files[PolicyLabelImportExport.fileName].dir
        ) {
            throw new Error('Zip file is not a rule');
        }
        const ruleString = await content.files[PolicyLabelImportExport.fileName].async('string');
        const label = JSON.parse(ruleString);
        return { label };
    }

    /**
     * Validate Config
     *
     * @param data config
     */
    public static validateRuleConfig(data?: IPolicyLabelConfig): IPolicyLabelConfig {
        const config: IPolicyLabelConfig = {
            fields: PolicyLabelImportExport.validateFields(data?.fields),
            variables: PolicyLabelImportExport.validateVariables(data?.variables),
            scores: PolicyLabelImportExport.validateScores(data?.scores),
            formulas: PolicyLabelImportExport.validateFormulas(data?.formulas),
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
                variables.push(PolicyLabelImportExport.validateVariable(variable));
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
            id: PolicyLabelImportExport.validateString(data.id),
            schemaId: PolicyLabelImportExport.validateString(data.schemaId),
            path: PolicyLabelImportExport.validateString(data.path),
            schemaName: PolicyLabelImportExport.validateString(data.schemaName),
            schemaPath: PolicyLabelImportExport.validateString(data.schemaPath),
            fieldType: PolicyLabelImportExport.validateString(data.fieldType),
            fieldRef: PolicyLabelImportExport.validateBoolean(data.fieldRef),
            fieldArray: PolicyLabelImportExport.validateBoolean(data.fieldArray),
            fieldDescription: PolicyLabelImportExport.validateString(data.fieldDescription),
            fieldProperty: PolicyLabelImportExport.validateString(data.fieldProperty),
            fieldPropertyName: PolicyLabelImportExport.validateString(data.fieldPropertyName),
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
                scores.push(PolicyLabelImportExport.validateScore(score));
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
            id: PolicyLabelImportExport.validateString(data.id),
            type: PolicyLabelImportExport.validateString(data.type),
            description: PolicyLabelImportExport.validateString(data.description),
            relationships: PolicyLabelImportExport.validateStrings(data.relationships),
            options: PolicyLabelImportExport.validateScoreOptions(data.options)
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
                formulas.push(PolicyLabelImportExport.validateFormula(formula));
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
            id: PolicyLabelImportExport.validateString(data.id),
            type: PolicyLabelImportExport.validateString(data.type),
            description: PolicyLabelImportExport.validateString(data.description),
            formula: PolicyLabelImportExport.validateString(data.formula),
        }
        return formula;
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
                options.push(PolicyLabelImportExport.validateScoreOption(option));
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
            description: PolicyLabelImportExport.validateString(data.description),
            value: PolicyLabelImportExport.validateStringOrNumber(data.value)
        }
        return formula;
    }

    /**
     * Validate config variables
     *
     * @param data variables
     */
    private static validateFields(data?: ISchemaRuleData[]): ISchemaRuleData[] {
        const fields: ISchemaRuleData[] = [];
        if (Array.isArray(data)) {
            for (const field of data) {
                fields.push(PolicyLabelImportExport.validateField(field));
            }
        }
        return fields;
    }

    /**
     * Validate config variable
     *
     * @param data variable
     */
    private static validateField(data?: ISchemaRuleData): ISchemaRuleData {
        const variable: ISchemaRuleData = {
            id: PolicyLabelImportExport.validateString(data.id),
            schemaId: PolicyLabelImportExport.validateString(data.schemaId),
            path: PolicyLabelImportExport.validateString(data.path),
            schemaName: PolicyLabelImportExport.validateString(data.schemaName),
            schemaPath: PolicyLabelImportExport.validateString(data.schemaPath),
            fieldType: PolicyLabelImportExport.validateString(data.fieldType),
            fieldRef: PolicyLabelImportExport.validateBoolean(data.fieldRef),
            fieldArray: PolicyLabelImportExport.validateBoolean(data.fieldArray),
            fieldDescription: PolicyLabelImportExport.validateString(data.fieldDescription),
            fieldProperty: PolicyLabelImportExport.validateString(data.fieldProperty),
            fieldPropertyName: PolicyLabelImportExport.validateString(data.fieldPropertyName),
            rule: PolicyLabelImportExport.validateRule(data.rule),
        };
        return variable;
    }

    /**
     * Validate config rule
     *
     * @param data variable
     */
    private static validateRule(
        data?: IFormulaRuleData | IConditionRuleData | IRangeRuleData
    ): IFormulaRuleData | IConditionRuleData | IRangeRuleData {
        if (data) {
            if (data.type === 'condition') {
                return PolicyLabelImportExport.validateConditionRule(data);
            } else if (data.type === 'formula') {
                return PolicyLabelImportExport.validateFormulaRule(data);
            } else if (data.type === 'range') {
                return PolicyLabelImportExport.validateRangeRule(data);
            }
        }
        return undefined;
    }

    /**
     * Validate range
     *
     * @param data range
     */
    private static validateRangeRule(data: IRangeRuleData): IRangeRuleData {
        const item: IRangeRuleData = {
            type: 'range',
            min: PolicyLabelImportExport.validateStringOrNumber(data.min),
            max: PolicyLabelImportExport.validateStringOrNumber(data.max)
        };
        return item;
    }

    /**
     * Validate formula
     *
     * @param data formula
     */
    private static validateFormulaRule(data: IFormulaRuleData): IFormulaRuleData {
        const item: IFormulaRuleData = {
            type: 'formula',
            formula: PolicyLabelImportExport.validateString(data.formula)
        };
        return item;
    }

    /**
     * Validate conditions
     *
     * @param data condition
     */
    private static validateConditionRule(data: IConditionRuleData): IConditionRuleData {
        const item: IConditionRuleData = {
            type: 'condition',
            conditions: PolicyLabelImportExport.validateCondition(data.conditions)
        };
        return item;
    }

    /**
     * Validate condition
     *
     * @param data condition
     */
    private static validateCondition(
        data: (IConditionIfData | IConditionElseData)[]
    ): (IConditionIfData | IConditionElseData)[] {
        const result: (IConditionIfData | IConditionElseData)[] = [];
        if (Array.isArray(data)) {
            for (const item of data) {
                if (item.type === 'if') {
                    result.push(PolicyLabelImportExport.validateIfCondition(item))
                } else if (item.type === 'else') {
                    result.push(PolicyLabelImportExport.validateElseCondition(item))
                }
            }
        }
        return result;
    }

    /**
     * Validate IfCondition
     *
     * @param data IfCondition
     */
    private static validateIfCondition(data: IConditionIfData): IConditionIfData {
        const item: IConditionIfData = {
            type: 'if',
            condition: PolicyLabelImportExport.validateIfConditionValue(data.condition),
            formula: PolicyLabelImportExport.validateIfConditionValue(data.formula),
        };
        return item;
    }

    /**
     * Validate ElseCondition
     *
     * @param data ElseCondition
     */
    private static validateElseCondition(data: IConditionElseData): IConditionElseData {
        const item: IConditionElseData = {
            type: 'else',
            formula: PolicyLabelImportExport.validateIfConditionValue(data.formula),
        };
        return item;
    }

    /**
     * Validate IfConditionValue
     *
     * @param data IfConditionValue
     */
    private static validateIfConditionValue(
        data: IConditionFormula | IConditionRange | IConditionText | IConditionEnum
    ): IConditionFormula | IConditionRange | IConditionText | IConditionEnum {
        if (data) {
            if (data.type === 'formula') {
                return {
                    type: 'formula',
                    formula: PolicyLabelImportExport.validateString(data.formula)
                }
            } else if (data.type === 'range') {
                return {
                    type: 'range',
                    variable: PolicyLabelImportExport.validateString(data.variable),
                    min: PolicyLabelImportExport.validateStringOrNumber(data.min),
                    max: PolicyLabelImportExport.validateStringOrNumber(data.max)
                }
            } else if (data.type === 'text') {
                return {
                    type: 'text',
                    variable: PolicyLabelImportExport.validateString(data.variable),
                    value: PolicyLabelImportExport.validateString(data.value)
                }
            } else if (data.type === 'enum') {
                return {
                    type: 'enum',
                    variable: PolicyLabelImportExport.validateString(data.variable),
                    value: PolicyLabelImportExport.validateStrings(data.value)
                }
            }
        }
        return {
            type: 'formula',
            formula: ''
        }
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
     * Validate Boolean
     *
     * @param data Boolean
     */
    private static validateBoolean(data: string | boolean): boolean {
        return data === 'true' || data === true;
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

    /**
     * Validate Strings
     *
     * @param data strings
     */
    private static validateStrings(data?: string[]): string[] {
        const items: string[] = [];
        if (Array.isArray(data)) {
            for (const item of data) {
                items.push(PolicyLabelImportExport.validateString(item));
            }
        }
        return items;
    }
}
