import { Hyperlink, Worksheet } from './workbook.js';
import { ISchema, Schema, SchemaCondition, SchemaField } from '@guardian/interfaces';
import { XlsxError } from '../interfaces/error.interface.js';
import { Policy, PolicyTool } from '../../entity/index.js';
import { ISchemaCache } from '../interfaces/cache.interface.js';
import { ITool } from '../interfaces/tool.interface.js';
import { ILink } from '../interfaces/link.interface.js';
import { XlsxEnum } from './xlsx-enum.js';
import { XlsxSchema, XlsxTool } from './xlsx-schema.js';

export class XlsxResult {
    private _policy: Policy;
    private readonly _schemas: XlsxSchema[];
    private readonly _toolSchemas: Schema[];
    private readonly _tools: PolicyTool[];
    private readonly _errors: XlsxError[];
    private readonly _enums: XlsxEnum[];
    private readonly _toolsCache: Map<string, ITool>;
    private readonly _linkCache: Map<string, ILink>;
    private readonly _schemaCache: ISchemaCache[];

    constructor() {
        this._schemas = [];
        this._toolSchemas = [];
        this._tools = [];
        this._errors = [];
        this._schemaCache = [];
        this._enums = [];
        this._toolsCache = new Map<string, ITool>();
        this._linkCache = new Map<string, ILink>();
    }

    public get policy(): Policy {
        return this._policy;
    }

    public get schemas(): Schema[] {
        return this._schemas.map((s) => s.schema);
    }

    public get toolSchemas(): Schema[] {
        return this._toolSchemas;
    }

    public get tools(): PolicyTool[] {
        return this._tools;
    }

    public get xlsxSchemas(): XlsxSchema[] {
        return this._schemas;
    }

    public addTool(
        worksheet: Worksheet,
        schema: XlsxTool,
    ): void {
        this._toolsCache.set(schema.messageId, {
            uuid: schema.messageId,
            name: schema.messageId,
            messageId: schema.messageId,
            worksheet: worksheet.name
        });
        this._schemaCache.push({
            name: schema.name,
            worksheet: worksheet.name,
            toolId: schema.messageId
        });
    }

    public addSchema(
        worksheet: Worksheet,
        schema: XlsxSchema
    ): void {
        this._schemas.push(schema);
        this._schemaCache.push({
            name: schema.schema.name,
            worksheet: worksheet.name,
            iri: schema.schema.iri
        });
    }

    public addError(
        error: XlsxError,
        target:
            XlsxSchema |
            SchemaField |
            Schema |
            SchemaCondition
    ): void {
        this._errors.push(error);
        if (target) {
            if (target.errors) {
                target.errors.push(error);
            } else {
                target.errors = [error];
            }
        }
    }

    public addErrors(errors: any[]) {
        for (const error of errors) {
            this._errors.push({
                ...error,
                type: 'error'
            });
        }
    }

    public addLink(name: string, hyperlink?: Hyperlink): string {
        const id = `link_${this._linkCache.size}`;
        const worksheet = hyperlink ? hyperlink.worksheet : null;
        this._linkCache.set(id, {
            name,
            worksheet
        });
        return id;
    }

    public clear(): void {
        this._schemas.length = 0;
        this._tools.length = 0;
        this._schemaCache.length = 0;
        this._toolsCache.clear();
        this._linkCache.clear();
    }

    public getToolIds(): ITool[] {
        return Array.from(this._toolsCache.values());
    }

    public toJson() {
        const tools = Array.from(this._toolsCache.values());
        const schemas = this._schemas.map((s) => {
            return {
                id: s.schema.id,
                iri: s.schema.iri,
                name: s.schema.name,
                description: s.schema.description,
                version: s.schema.version,
                status: s.schema.status
            };
        });
        return {
            schemas,
            tools,
            errors: this._errors,
        };
    }

    public updatePolicy(policy: Policy): void {
        this._policy = policy;
    }

    public updateTool(tool: PolicyTool, schemas: ISchema[]): void {
        try {
            this._tools.push(tool);
            this._toolsCache.set(tool.messageId, {
                uuid: tool.uuid,
                name: tool.name,
                messageId: tool.messageId
            });
            for (const cache of this._schemaCache) {
                if (cache.toolId === tool.messageId) {
                    const schema = schemas.find(s => s.name === cache.name);
                    cache.iri = schema?.iri;
                }
            }
            for (const schema of schemas) {
                this._toolSchemas.push(new Schema(schema));
            }
        } catch (error) {
            this.addError({
                type: 'error',
                text: 'Failed to update tools.',
                message: error?.toString()
            }, null);
        }
    }

    public updateSchemas(skipTools: boolean = false): void {
        try {
            const schemaNames = new Set<string>();
            for (const cache of this._schemaCache) {
                if (schemaNames.has(cache.name)) {
                    this.addError({
                        type: 'warning',
                        text: `Duplicate schema name (${cache.name}).`,
                        message: `Duplicate schema name (${cache.name}).`,
                        worksheet: cache?.worksheet
                    }, null);
                }
                schemaNames.add(cache.name);
            }
            const schemas = this.schemas;
            const toolSchemas = this.toolSchemas;
            const allSchemas = [...schemas, ...toolSchemas];
            for (const schema of schemas) {
                const schemaCache = this._schemaCache.find(c => c.iri === schema.iri);
                for (const field of schema.fields) {
                    if (field.isRef) {
                        if (field.type === '#GeoJSON') {
                            continue;
                        }
                        const link = this._linkCache.get(field.type);
                        if (!link) {
                            this.addError({
                                type: 'error',
                                text: `Unknown field type.`,
                                message: `Unknown field type.`,
                                worksheet: schemaCache?.worksheet,
                                row: field.order
                            }, field);
                        }

                        let subSchemaCache: ISchemaCache;
                        if (link.worksheet) {
                            subSchemaCache = this._schemaCache.find(c => c.worksheet === link.worksheet);
                        }
                        if (link.name && !subSchemaCache) {
                            subSchemaCache = this._schemaCache.find(c => c.worksheet === link.name);
                        }
                        if (link.name && !subSchemaCache) {
                            subSchemaCache = this._schemaCache.find(c => c.name === link.name);
                        }

                        if (subSchemaCache && subSchemaCache.iri) {
                            field.type = subSchemaCache.iri;
                        } else {
                            if (!subSchemaCache || !subSchemaCache.toolId || !skipTools) {
                                this.addError({
                                    type: 'error',
                                    text: `Sub-schema named "${link.name}" not found.`,
                                    message: `Sub-schema named "${link.name}" not found.`,
                                    worksheet: schemaCache?.worksheet,
                                    row: field.order
                                }, field);
                            }
                            field.type = null;
                        }
                    }
                }
                schema.updateDocument();
                schema.updateRefs(schemas);
            }
            for (const schema of this._schemas) {
                try {
                    schema.updateExpressions(allSchemas);
                } catch (error) {
                    this.addError({
                        type: 'error',
                        text: 'Failed to parse variables.',
                        message: error?.toString(),
                        worksheet: schema.worksheet.name
                    }, schema);
                }
            }
        } catch (error) {
            this.addError({
                type: 'error',
                text: 'Failed to update schemas.',
                message: error?.toString()
            }, null);
        }
    }

    public addEnum(item: XlsxEnum): void {
        this._enums.push(item);
    }

    public getEnum(worksheet: string): string[] {
        for (const item of this._enums) {
            if (item.worksheet.name === worksheet) {
                return item.data;
            }
        }

    }
}
