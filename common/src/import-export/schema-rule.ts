import JSZip from 'jszip';
import { SchemaRule } from '../entity/index.js';
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
    ISchemaRulesConfig
} from '@guardian/interfaces';

/**
 * SchemaRule components
 */
export interface ISchemaRuleComponents {
    rule: SchemaRule;
}

/**
 * SchemaRule import export
 */
export class SchemaRuleImportExport {
    /**
     * SchemaRule filename
     */
    public static readonly ruleFileName = 'rules.json';

    /**
     * Load SchemaRule components
     * @param rule SchemaRule
     *
     * @returns components
     */
    public static async loadSchemaRuleComponents(rule: SchemaRule): Promise<ISchemaRuleComponents> {
        return { rule };
    }

    /**
     * Generate Zip File
     * @param rule rule to pack
     *
     * @returns Zip file
     */
    public static async generate(rule: SchemaRule): Promise<JSZip> {
        const components = await SchemaRuleImportExport.loadSchemaRuleComponents(rule);
        const file = await SchemaRuleImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components rule components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: ISchemaRuleComponents): Promise<JSZip> {
        const object = { ...components.rule };
        delete object.id;
        delete object._id;
        delete object.owner;
        delete object.createDate;
        delete object.updateDate;
        const zip = new JSZip();
        zip.file(SchemaRuleImportExport.ruleFileName, JSON.stringify(object));
        return zip;
    }

    /**
     * Parse zip rule file
     * @param zipFile Zip file
     * @returns Parsed rule
     */
    public static async parseZipFile(zipFile: any): Promise<ISchemaRuleComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (
            !content.files[SchemaRuleImportExport.ruleFileName] ||
            content.files[SchemaRuleImportExport.ruleFileName].dir
        ) {
            throw new Error('Zip file is not a rule');
        }
        const ruleString = await content.files[SchemaRuleImportExport.ruleFileName].async('string');
        const rule = JSON.parse(ruleString);
        return { rule };
    }

    /**
     * Validate Config
     * 
     * @param data config
     */
    public static validateRuleConfig(data?: ISchemaRulesConfig): ISchemaRulesConfig {
        const config: ISchemaRulesConfig = {
            fields: SchemaRuleImportExport.validateVariables(data?.fields),
        }
        return config;
    }

    /**
     * Validate config variables
     * 
     * @param data variables
     */
    private static validateVariables(data?: ISchemaRuleData[]): ISchemaRuleData[] {
        const fields: ISchemaRuleData[] = [];
        if (Array.isArray(data)) {
            for (const field of data) {
                fields.push(SchemaRuleImportExport.validateVariable(field));
            }
        }
        return fields;
    }

    /**
     * Validate config variable
     * 
     * @param data variable
     */
    private static validateVariable(data?: ISchemaRuleData): ISchemaRuleData {
        const variable: ISchemaRuleData = {
            id: SchemaRuleImportExport.validateString(data.id),
            schemaId: SchemaRuleImportExport.validateString(data.schemaId),
            path: SchemaRuleImportExport.validateString(data.path),
            schemaName: SchemaRuleImportExport.validateString(data.schemaName),
            schemaPath: SchemaRuleImportExport.validateString(data.schemaPath),
            fieldType: SchemaRuleImportExport.validateString(data.fieldType),
            fieldRef: SchemaRuleImportExport.validateBoolean(data.fieldRef),
            fieldArray: SchemaRuleImportExport.validateBoolean(data.fieldArray),
            fieldDescription: SchemaRuleImportExport.validateString(data.fieldDescription),
            fieldProperty: SchemaRuleImportExport.validateString(data.fieldProperty),
            fieldPropertyName: SchemaRuleImportExport.validateString(data.fieldPropertyName),
            rule: SchemaRuleImportExport.validateRule(data.rule),
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
                return SchemaRuleImportExport.validateConditionRule(data);
            } else if (data.type === 'formula') {
                return SchemaRuleImportExport.validateFormulaRule(data);
            } else if (data.type === 'range') {
                return SchemaRuleImportExport.validateRangeRule(data);
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
            min: SchemaRuleImportExport.validateStringOrNumber(data.min),
            max: SchemaRuleImportExport.validateStringOrNumber(data.max)
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
            formula: SchemaRuleImportExport.validateString(data.formula)
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
            conditions: SchemaRuleImportExport.validateCondition(data.conditions)
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
                    result.push(SchemaRuleImportExport.validateIfCondition(item))
                } else if (item.type === 'else') {
                    result.push(SchemaRuleImportExport.validateElseCondition(item))
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
            condition: SchemaRuleImportExport.validateIfConditionValue(data.condition),
            formula: SchemaRuleImportExport.validateIfConditionValue(data.formula),
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
            formula: SchemaRuleImportExport.validateIfConditionValue(data.formula),
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
                    formula: SchemaRuleImportExport.validateString(data.formula)
                }
            } else if (data.type === 'range') {
                return {
                    type: 'range',
                    variable: SchemaRuleImportExport.validateString(data.variable),
                    min: SchemaRuleImportExport.validateStringOrNumber(data.min),
                    max: SchemaRuleImportExport.validateStringOrNumber(data.max)
                }
            } else if (data.type === 'text') {
                return {
                    type: 'text',
                    variable: SchemaRuleImportExport.validateString(data.variable),
                    value: SchemaRuleImportExport.validateString(data.value)
                }
            } else if (data.type === 'enum') {
                return {
                    type: 'enum',
                    variable: SchemaRuleImportExport.validateString(data.variable),
                    value: SchemaRuleImportExport.validateStrings(data.value)
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
                items.push(SchemaRuleImportExport.validateString(item));
            }
        }
        return items;
    }
}
