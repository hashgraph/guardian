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
    IScoreOption,
    INavItemConfig,
    INavImportsConfig,
    NavItemType,
    ILabelItemConfig,
    IStatisticItemConfig,
    IRulesItemConfig,
    IGroupItemConfig,
    INavLabelImportConfig,
    INavStatisticImportConfig
} from '@guardian/interfaces';
import { PolicyStatisticImportExport } from './policy-statistic.js';

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
    public static validateConfig(data?: IPolicyLabelConfig): IPolicyLabelConfig {
        const config: IPolicyLabelConfig = {
            imports: PolicyLabelImportExport.validateImports(data?.imports),
            children: PolicyLabelImportExport.validateChildren(data?.children),
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
                rule: PolicyLabelImportExport.validateString(data.rule),
                children: PolicyLabelImportExport.validateChildren(data.children),
            };
            return child;
        }
        if (data?.type === NavItemType.Label) {
            const child: ILabelItemConfig = {
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
        if (data?.type === NavItemType.Rules) {
            const child: IRulesItemConfig = {
                id: PolicyLabelImportExport.validateString(data.id),
                type: NavItemType.Rules,
                name: PolicyLabelImportExport.validateString(data.name),
                config: PolicyStatisticImportExport.validateConfig(data.config),
            };
            return child;
        }
        if (data?.type === NavItemType.Statistic) {
            const child: IStatisticItemConfig = {
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
}
