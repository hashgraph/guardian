import JSZip from 'jszip';
import { PolicyLabel, Policy, Schema as SchemaCollection } from '../entity/index.js';
import {
    IPolicyLabelConfig,
    INavItemConfig,
    INavImportsConfig,
    NavItemType,
    ILabelItemConfig,
    IStatisticItemConfig,
    IRulesItemConfig,
    IGroupItemConfig,
    INavLabelImportConfig,
    INavStatisticImportConfig,
    IStatisticConfig,
    SchemaEntity,
    SchemaStatus,
    Schema
} from '@guardian/interfaces';
import { PolicyStatisticImportExport } from './policy-statistic.js';
import { PolicyImportExport } from './policy.js';
import { DatabaseServer } from '../database-modules/index.js';
import {ImportExportUtils} from './utils.js';

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

        const ZIP_FILE_OPTIONS = ImportExportUtils.getDeterministicZipFileOptions();
        zip.file(PolicyLabelImportExport.fileName, JSON.stringify(object), ZIP_FILE_OPTIONS);

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
    public static validateConfig(data?: IPolicyLabelConfig): IPolicyLabelConfig {
        const config: IPolicyLabelConfig = {
            imports: PolicyLabelImportExport.validateImports(data?.imports),
            children: PolicyLabelImportExport.validateChildren(data?.children),
            schemaId: PolicyLabelImportExport.validateString(data?.schemaId),
        }
        return config;
    }

    /**
     * Validate children
     *
     * @param data children
     */
    private static validateChildren(data?: INavItemConfig[]): INavItemConfig[] {
        const children: INavItemConfig[] = [];
        if (Array.isArray(data)) {
            for (const variable of data) {
                const item = PolicyLabelImportExport.validateChild(variable);
                if (item) {
                    children.push(item);
                }
            }
        }
        return children;
    }

    /**
     * Validate imports
     *
     * @param data imports
     */
    private static validateImports(data?: INavImportsConfig[]): INavImportsConfig[] {
        const imports: INavImportsConfig[] = [];
        if (Array.isArray(data)) {
            for (const variable of data) {
                const item = PolicyLabelImportExport.validateImport(variable);
                if (item) {
                    imports.push(item);
                }
            }
        }
        return imports;
    }

    /**
     * Validate child
     *
     * @param data child
     */
    private static validateChild(data: INavItemConfig): INavItemConfig | null {
        if (data?.type === NavItemType.Group) {
            const child: IGroupItemConfig = {
                id: PolicyLabelImportExport.validateString(data.id),
                type: NavItemType.Group,
                name: PolicyLabelImportExport.validateString(data.name),
                title: PolicyLabelImportExport.validateString(data.title),
                tag: PolicyLabelImportExport.validateTag(data.tag),
                rule: PolicyLabelImportExport.validateString(data.rule) as any,
                schemaId: PolicyLabelImportExport.validateString(data.schemaId),
                children: PolicyLabelImportExport.validateChildren(data.children),
            };
            return child;
        }
        if (data?.type === NavItemType.Label) {
            const child: ILabelItemConfig = {
                id: PolicyLabelImportExport.validateString(data.id),
                type: NavItemType.Label,
                name: PolicyLabelImportExport.validateString(data.name),
                title: PolicyLabelImportExport.validateString(data.title),
                tag: PolicyLabelImportExport.validateTag(data.tag),
                description: PolicyLabelImportExport.validateString(data.description),
                owner: PolicyLabelImportExport.validateString(data.owner),
                schemaId: PolicyLabelImportExport.validateString(data.schemaId),
                messageId: PolicyLabelImportExport.validateString(data.messageId),
                config: PolicyLabelImportExport.validateConfig(data.config),
            };
            return child;
        }
        if (data?.type === NavItemType.Rules) {
            const child: IRulesItemConfig = {
                id: PolicyLabelImportExport.validateString(data.id),
                type: NavItemType.Rules,
                name: PolicyLabelImportExport.validateString(data.name),
                title: PolicyLabelImportExport.validateString(data.title),
                tag: PolicyLabelImportExport.validateTag(data.tag),
                schemaId: PolicyLabelImportExport.validateString(data.schemaId),
                config: PolicyLabelImportExport.validateRulesConfig(data.config),
            };
            return child;
        }
        if (data?.type === NavItemType.Statistic) {
            const child: IStatisticItemConfig = {
                id: PolicyLabelImportExport.validateString(data.id),
                type: NavItemType.Statistic,
                name: PolicyLabelImportExport.validateString(data.name),
                title: PolicyLabelImportExport.validateString(data.title),
                tag: PolicyLabelImportExport.validateTag(data.tag),
                description: PolicyLabelImportExport.validateString(data.description),
                owner: PolicyLabelImportExport.validateString(data.owner),
                messageId: PolicyLabelImportExport.validateString(data.messageId),
                schemaId: PolicyLabelImportExport.validateString(data.schemaId),
                config: PolicyStatisticImportExport.validateConfig(data.config),
            };
            return child;
        }
        return null;
    }

    /**
     * Validate import
     *
     * @param data import
     */
    private static validateImport(data: INavImportsConfig): INavImportsConfig | null {
        if (data?.type === NavItemType.Label) {
            const child: INavLabelImportConfig = {
                id: PolicyLabelImportExport.validateString(data.id),
                type: NavItemType.Label,
                name: PolicyLabelImportExport.validateString(data.name),
                description: PolicyLabelImportExport.validateString(data.description),
                owner: PolicyLabelImportExport.validateString(data.owner),
                messageId: PolicyLabelImportExport.validateString(data.messageId),
                config: PolicyLabelImportExport.validateConfig(data.config),
            };
            return child;
        }
        if (data?.type === NavItemType.Statistic) {
            const child: INavStatisticImportConfig = {
                id: PolicyLabelImportExport.validateString(data.id),
                type: NavItemType.Statistic,
                name: PolicyLabelImportExport.validateString(data.name),
                description: PolicyLabelImportExport.validateString(data.description),
                owner: PolicyLabelImportExport.validateString(data.owner),
                messageId: PolicyLabelImportExport.validateString(data.messageId),
                config: PolicyStatisticImportExport.validateConfig(data.config),
            };
            return child;
        }
        return null;
    }

    /**
     * Validate Config
     *
     * @param data config
     */
    public static validateRulesConfig(data?: IStatisticConfig): IStatisticConfig {
        const config: IStatisticConfig = {
            variables: PolicyStatisticImportExport.validateVariables(data?.variables),
            scores: PolicyStatisticImportExport.validateScores(data?.scores),
            formulas: PolicyStatisticImportExport.validateFormulasWithRule(data?.formulas)
        }
        return config;
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
     * Validate Tag
     *
     * @param data String
     */
    private static validateTag(data: string): string {
        if (typeof data === 'string') {
            return data.trim().replace(/\s/ig, '_');
        } else {
            return '';
        }
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
    public static updateSchemas(
        schemas: SchemaCollection[],
        data?: IPolicyLabelConfig
    ): IPolicyLabelConfig | undefined {
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

        if (Array.isArray(data?.children)) {
            for (const item of data.children) {
                PolicyLabelImportExport._updateSchemas(fieldMap, item);
            }
        }

        return data;
    }

    private static _updateSchemas(
        fieldMap: Map<string, string>,
        data: INavItemConfig
    ): void {
        if (!data) {
            return;
        }
        if (data.type === NavItemType.Group) {
            if (Array.isArray(data.children)) {
                for (const item of data.children) {
                    PolicyLabelImportExport._updateSchemas(fieldMap, item);
                }
            }
        }
        if (data.type === NavItemType.Label) {
            if (Array.isArray(data.config?.children)) {
                for (const item of data.config.children) {
                    PolicyLabelImportExport._updateSchemas(fieldMap, item);
                }
            }
        }
        if (data.type === NavItemType.Rules || data.type === NavItemType.Statistic) {
            const config = data.config;
            const variables = config.variables;
            const rules = config.rules;

            const schemaMap = new Map<string, string>();
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
        }
    }
}
