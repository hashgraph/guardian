import JSZip from 'jszip';
import { Formula } from '../entity/formula.js';
import { Policy } from '../entity/policy.js';
import { EntityStatus, GenerateUUIDv4, IFormulaConfig } from '@guardian/interfaces';
import { DatabaseServer } from '../database-modules/database-server.js';
import { ImportExportUtils } from './utils.js';
import { findBlocks } from '../helpers/utils.js';

interface ISchemaComponents {
    iri: string;
    name?: string;
    description?: string;
    version?: string;
}

/**
 * Formula components
 */
export interface IFormulaComponents {
    formula: Formula;
    schemas: ISchemaComponents[];
}

/**
 * Formula import export
 */
export class FormulaImportExport {
    /**
     * Formula filename
     */
    public static readonly formulaFileName = 'formula.json';
    /**
     * Formula filename
     */
    public static readonly schemasFileName = 'schemas.json';

    /**
     * Load Formula components
     * @param formula Formula
     *
     * @returns components
     */
    public static async loadFormulaComponents(formula: Formula): Promise<IFormulaComponents> {
        const policy = await DatabaseServer.getPolicyById(formula.policyId);
        const schemas: ISchemaComponents[] = [];
        const ids = FormulaImportExport.getSchemaIds(formula.config);
        if (policy) {
            const schemaDocuments = await DatabaseServer.getSchemas({ topicId: policy.topicId });
            for (const schema of schemaDocuments) {
                if (ids.has(schema.iri)) {
                    schemas.push({
                        name: schema.name,
                        description: schema.description,
                        version: schema.version,
                        iri: schema.iri
                    });
                    ids.delete(schema.iri)
                }
            }
        }
        for (const iri of ids) {
            schemas.push({
                iri
            });
        }
        return { formula, schemas };
    }

    /**
     * Generate Zip File
     * @param formula formula
     *
     * @returns Zip file
     */
    public static async generate(formula: Formula): Promise<JSZip> {
        const components = await FormulaImportExport.loadFormulaComponents(formula);
        const file = await FormulaImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components formula components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: IFormulaComponents): Promise<JSZip> {
        const formulas = { ...components.formula };
        formulas.config = FormulaImportExport.validateConfig(formulas.config);
        delete formulas.id;
        delete formulas._id;
        delete formulas.owner;
        delete formulas.createDate;
        delete formulas.updateDate;
        const schemas = components.schemas;
        const zip = new JSZip();

        const ZIP_FILE_OPTIONS = ImportExportUtils.getDeterministicZipFileOptions();

        zip.file(FormulaImportExport.schemasFileName, JSON.stringify(schemas), ZIP_FILE_OPTIONS);
        zip.file(FormulaImportExport.formulaFileName, JSON.stringify(formulas), ZIP_FILE_OPTIONS);
        return zip;
    }

    /**
     * Parse zip formula file
     * @param zipFile Zip file
     * @returns Parsed formula
     */
    public static async parseZipFile(zipFile: any): Promise<IFormulaComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (
            !content.files[FormulaImportExport.formulaFileName] ||
            content.files[FormulaImportExport.formulaFileName].dir
        ) {
            throw new Error('Zip file is not a formula');
        }
        const formulaString = await content.files[FormulaImportExport.formulaFileName].async('string');
        const formula = JSON.parse(formulaString);

        const schemasFile = (Object.entries(content.files).find(file => file[0] === FormulaImportExport.schemasFileName));
        const schemasString = schemasFile && await schemasFile[1].async('string') || '[]';
        const schemas: any[] = JSON.parse(schemasString);

        return { formula, schemas };
    }

    /**
     * Validate Config: drops relationships that match no item. The config is changed in place.
     *
     * @param data config
     */
    public static validateConfig(data?: IFormulaConfig): IFormulaConfig {
        const items = data?.formulas;
        if (!Array.isArray(items)) {
            return data;
        }
        const uuids = new Set<string>(items.map((item: any) => item?.uuid));
        for (const item of items as any[]) {
            if (Array.isArray(item?.relationships)) {
                item.relationships = item.relationships.filter((uuid: string) => uuids.has(uuid));
            }
        }
        return data;
    }

    /**
     * Distinct link objects of an item: `links` and the mirrored `link`.
     * Items saved before `links` existed have `link` only.
     */
    private static getLinkObjects(item: any): any[] {
        const result = new Set<any>();
        if (item?.link) {
            result.add(item.link);
        }
        if (Array.isArray(item?.links)) {
            for (const link of item.links) {
                if (link) {
                    result.add(link);
                }
            }
        }
        return Array.from(result);
    }

    /**
     * Replace Ids
     *
     * @param data config
     */
    public static replaceIds(data: IFormulaConfig, oldId: string, newId: string): IFormulaConfig {
        if (data) {
            const formulas = data.formulas;
            if (Array.isArray(formulas)) {
                for (const component of formulas) {
                    for (const link of FormulaImportExport.getLinkObjects(component)) {
                        if (link.entityId === oldId) {
                            link.entityId = newId;
                        }
                    }
                }
            }
        }
        return data;
    }

    public static getSchemaIds(data: IFormulaConfig): Set<string> {
        const ids = new Set<string>();
        if (data) {
            const formulas = data.formulas;
            if (Array.isArray(formulas)) {
                for (const component of formulas) {
                    for (const link of FormulaImportExport.getLinkObjects(component)) {
                        if (link.type === 'schema') {
                            ids.add(link.entityId)
                        }
                    }
                }
            }
        }
        return ids;
    }

    public static async updateUUID(components: IFormulaComponents, policy: Policy): Promise<IFormulaComponents> {
        const map = new Map<string, string>();
        const schemaDocument = await DatabaseServer.getSchemas({ topicId: policy.topicId });
        for (const schema of schemaDocument) {
            const _id = `${schema.name}#${schema.description}`;
            map.set(_id, schema.iri);
        }
        const schemas = components.schemas || [];
        const idMap = new Map<string, string>();
        for (const schema of schemas) {
            const _id = `${schema.name}#${schema.description}`;
            const newId = map.get(_id);
            const oldId = schema.iri;
            if (newId && oldId) {
                idMap.set(oldId, newId);
            }
        }
        const config = components.formula.config;
        if (config) {
            const formulas = config.formulas;
            if (Array.isArray(formulas)) {
                for (const component of formulas) {
                    for (const link of FormulaImportExport.getLinkObjects(component)) {
                        if (link.type === 'schema' && idMap.has(link.entityId)) {
                            link.entityId = idMap.get(link.entityId);
                        }
                    }
                }
            }
        }
        return components;
    }

    public static generateByPolicy(policy: Policy): Formula | null {
        const blocks = findBlocks(policy.config, (b) => b.blockType === 'mathBlock');
        const formulas: any[] = [];
        for (const block of blocks) {
            FormulaImportExport.generateFormulaByBlock(block, formulas);
        }
        if (formulas.length) {
            return {
                uuid: GenerateUUIDv4(),
                name: policy.name,
                description: policy.description,
                owner: policy.owner,
                policyId: policy.id,
                policyInstanceTopicId: policy.instanceTopicId,
                policyTopicId: policy.topicId,
                status: EntityStatus.DRAFT,
                autoGenerated: true,
                config: {
                    files: [],
                    formulas
                }
            } as any
        } else {
            return null;
        }
    }

    private static getItems(items: any, result: any[]) {
        if (Array.isArray(items)) {
            for (const item of items) {
                if (item.type === 'group') {
                    FormulaImportExport.getItems(item.items, result);
                } else {
                    result.push(item);
                }
            }
        }
        return result;
    }

    private static generateFormulaByBlock(block: any, result: any[]) {
        try {
            const inputSchema = block.inputSchema;
            const outputSchema = block.outputSchema || inputSchema;
            const expression = block.expression;
            const items: any[] = [];
            // Variables
            const variables = FormulaImportExport.getItems(expression?.variables, []);
            for (const item of variables) {
                items.push({
                    uuid: GenerateUUIDv4(),
                    name: item.name,
                    description: item.description,
                    type: 'variable',
                    value: '',
                    link: {
                        entityId: inputSchema,
                        item: item.field,
                        type: 'schema'
                    }
                })
            }
            // Formulas
            const formulas = FormulaImportExport.getItems(expression?.formulas, []);
            for (const item of formulas) {
                items.push({
                    uuid: GenerateUUIDv4(),
                    name: item.name,
                    description: item.description,
                    type: 'formula',
                    value: item.body,
                    relationships: item.relationships
                })
            }
            // Relationships
            for (const item of items) {
                const relationships: string[] = [];
                if (Array.isArray(item.relationships)) {
                    for (const name of item.relationships) {
                        const link = items.find((e) => e.name === name);
                        if (link) {
                            relationships.push(link.uuid);
                        }
                    }
                }
                item.relationships = relationships;
            }
            const outputs = FormulaImportExport.getItems(expression?.outputs, []);
            const columnWrappers = new Map<string, any>();
            const addColumnLink = (output: any, columnKey: string, rawName: unknown) => {
                const text = typeof rawName === 'string' ? rawName.trim() : '';
                if (!(/^[A-Za-z]\w*(?:,\w+)*$/).test(text)) {
                    return;
                }
                const name = text.replace(/,/g, '_');
                let target = items.find((entry) => entry.name === name);
                if (!target) {
                    return;
                }
                if (target.type === 'variable') {
                    let wrapper = columnWrappers.get(name);
                    if (!wrapper) {
                        wrapper = {
                            uuid: GenerateUUIDv4(),
                            name,
                            description: block.tag,
                            type: 'formula',
                            value: name,
                            relationships: [target.uuid]
                        };
                        items.push(wrapper);
                        columnWrappers.set(name, wrapper);
                    }
                    target = wrapper;
                }
                const link = { entityId: outputSchema, item: output.field, type: 'schema', columnKey };
                const links = Array.isArray(target.links) ? target.links : (target.link ? [target.link] : []);
                if (!links.some((entry: any) => entry.entityId === link.entityId &&
                    entry.item === link.item && entry.columnKey === columnKey)) {
                    links.push(link);
                }
                target.links = links;
                target.link = links[0];
            };
            for (const item of outputs) {
                if (item.columns && typeof item.columns === 'object') {
                    for (const [key, name] of Object.entries(item.columns)) {
                        addColumnLink(item, key, name);
                    }
                    continue;
                }
                if (Array.isArray(item.rows) || Array.isArray(item.tables)) {
                    continue;
                }
                let link = items.find((e) => e.name === item.name);
                if (link) {
                    if (link.type === 'variable') {
                        const newTarget = {
                            uuid: GenerateUUIDv4(),
                            name: item.name,
                            description: block.tag,
                            type: 'formula',
                            value: item.name,
                            relationships: [link.uuid]
                        };
                        items.push(newTarget);
                        link = newTarget;
                    }
                    const target = {
                        entityId: outputSchema,
                        item: item.field,
                        type: 'schema'
                    };
                    if (Array.isArray(link.links)) {
                        link.links.push(target);
                        link.link = link.links[0];
                    } else {
                        link.link = target;
                    }
                }
            }
            for (const item of items) {
                result.push(item);
            }
            return result;
        } catch (error) {
            console.error(error);
            return;
        }
    }
}
