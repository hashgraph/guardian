import JSZip from 'jszip';
import { Formula, Policy } from '../entity/index.js';
import { EntityStatus, GenerateUUIDv4, IFormulaConfig } from '@guardian/interfaces';
import { DatabaseServer } from '../database-modules/index.js';
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
     * Validate Config
     *
     * @param data config
     */
    public static validateConfig(data?: IFormulaConfig): IFormulaConfig {
        return data;
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
                    if (component.link && component.link.entityId === oldId) {
                        component.link.entityId = newId;
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
                    const link = component.link;
                    if (link && link.type === 'schema') {
                        ids.add(link.entityId)
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
                    if (component.link && component.link.type === 'schema') {
                        if (idMap.has(component.link.entityId)) {
                            component.link.entityId = idMap.get(component.link.entityId);
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

    private static generateFormulaByBlock(block: any, result: any[]) {
        try {
            const inputSchema = block.inputSchema;
            const outputSchema = block.outputSchema || inputSchema;
            const expression = block.expression;
            const items: any[] = [];
            // Variables
            if (Array.isArray(expression?.variables)) {
                for (const item of expression.variables) {
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
            }
            // Formulas
            if (Array.isArray(expression?.formulas)) {
                for (const item of expression.formulas) {
                    items.push({
                        uuid: GenerateUUIDv4(),
                        name: item.name,
                        description: item.description,
                        type: 'formula',
                        value: item.body,
                        relationships: item.relationships
                    })
                }
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
            // Outputs
            if (Array.isArray(expression?.outputs)) {
                for (const item of expression.outputs) {
                    let link = items.find((e) => e.name === item.name);
                    if (link.type === 'variable') {
                        const newTarget = {
                            uuid: GenerateUUIDv4(),
                            name: item.name,
                            description: block.tag,
                            type: 'formula',
                            value: item.name,
                            relationships: [link.uuid]
                        }
                        items.push(newTarget);
                        link = newTarget;
                    }
                    link.link = {
                        entityId: outputSchema,
                        item: item.field,
                        type: 'schema'
                    }
                }
            }

            for (const item of items) {
                result.push(item);
            }
            return result;
        } catch (error) {
            return;
        }
    }
}
