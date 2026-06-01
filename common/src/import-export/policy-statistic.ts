import JSZip from 'jszip';
import { Policy, PolicyStatistic, Schema as SchemaCollection } from '../entity/index.js';
import {
    EntityStatus,
    IFormulaData,
    IRuleData,
    IScoreData,
    IScoreOption,
    IStatisticConfig,
    IVariableData,
    Schema,
    SchemaEntity,
    SchemaStatus
} from '@guardian/interfaces';
import { SchemaRuleImportExport } from './schema-rule.js';
import { PolicyImportExport } from './policy.js';
import { DatabaseServer } from '../database-modules/index.js';
import { ImportExportUtils } from './utils.js';

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
        const ZIP_FILE_OPTIONS = ImportExportUtils.getDeterministicZipFileOptions();
        zip.file(PolicyStatisticImportExport.policyStatisticFileName, JSON.stringify(object), ZIP_FILE_OPTIONS);

        if (object.status === EntityStatus.PUBLISHED && object.contentFileId) {
            ImportExportUtils.addDeterministicZipDir(zip, 'ipfs');

            const buffer = await DatabaseServer.loadFile(object.contentFileId);
            zip.file(`ipfs/${object.uuid}.json`, Buffer.from(buffer), ZIP_FILE_OPTIONS);
        }

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
     * Load policy schemas
     * @param policy policy
     * @returns policy schemas
     */
    public static async getPolicySchemas(policy: Policy): Promise<SchemaCollection[]> {
        const { schemas, toolSchemas } = await PolicyImportExport.loadAllSchemas(policy);
        const systemSchemas = await DatabaseServer.getSchemas({
            topicId: policy.topicId,
            entity: { $in: [SchemaEntity.MINT_TOKEN, SchemaEntity.MINT_NFTOKEN] }
        });

        const all = []
            .concat(schemas, toolSchemas, systemSchemas)
            .filter((s) => s.status === SchemaStatus.PUBLISHED && s.entity !== 'EVC');
        return all;
    }

    /**
     * Update schema uuid
     * @param schemas policy schemas
     * @param data config
     * @returns new config
     */
    public static updateSchemas(schemas: SchemaCollection[], data?: IStatisticConfig): IStatisticConfig | undefined {
        if (!data) {
            return;
        }

        const fieldMap = new Map<string, string>();
        const schemaObjects = schemas.map((s) => new Schema(s));
        for (const schema of schemaObjects) {
            const allFields = schema.getFields();
            for (const field of allFields) {
                const key = `${schema.name}|${field.path}|${field.description}|${field.type}|${field.isArray}|${field.isRef}`;
                fieldMap.set(key, schema.iri);
            }
        }

        const schemaMap = new Map<string, string>();
        const variables = data.variables;
        const rules = data.rules;

        if (Array.isArray(variables)) {
            for (const variable of variables) {
                const key = `${variable.schemaName}|${variable.path}|${variable.fieldDescription}|${variable.fieldType}|${variable.fieldArray}|${variable.fieldRef}`;
                schemaMap.set(variable.schemaId, fieldMap.get(key));
            }
        }

        if (Array.isArray(variables)) {
            for (const variable of variables) {
                variable.schemaId = schemaMap.get(variable.schemaId);
            }
        }

        if (Array.isArray(rules)) {
            for (const rule of rules) {
                rule.schemaId = schemaMap.get(rule.schemaId);
            }
        }

        return data;
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
    public static validateVariables(data?: IVariableData[]): IVariableData[] {
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
    public static validateScores(data?: IScoreData[]): IScoreData[] {
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
    public static validateFormulas(data?: IFormulaData[]): IFormulaData[] {
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
     * Validate Formulas with rule
     *
     * @param data Formulas
     */
    public static validateFormulasWithRule(data?: IFormulaData[]): IFormulaData[] {
        const formulas: IFormulaData[] = [];
        if (Array.isArray(data)) {
            for (const formula of data) {
                formulas.push(PolicyStatisticImportExport.validateFormulaWithRule(formula));
            }
        }
        return formulas;
    }

    /**
     * Validate Formula with rule
     *
     * @param data Formula
     */
    private static validateFormulaWithRule(data?: IFormulaData): IFormulaData {
        const formula: IFormulaData = {
            id: PolicyStatisticImportExport.validateString(data.id),
            type: PolicyStatisticImportExport.validateString(data.type),
            description: PolicyStatisticImportExport.validateString(data.description),
            formula: PolicyStatisticImportExport.validateString(data.formula),
            rule: SchemaRuleImportExport.validateRule(data.rule),
        }
        return formula;
    }

    /**
     * Validate Rules
     *
     * @param data Rules
     */
    public static validateRules(data?: IRuleData[]): IRuleData[] {
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
