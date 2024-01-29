import { Hyperlink, Worksheet } from './workbook';
import { ISchema, Schema, SchemaCondition, SchemaField } from '@guardian/interfaces';
import { XlsxError } from '../interfaces/error.interface';
import { Policy, PolicyTool } from '../../entity';
import { ISchemaCache } from '../interfaces/cache.interface';
import { ITool } from '../interfaces/tool.interface';
import { ILink } from '../interfaces/link.interface';
import { XlsxEnum } from './xlsx-enum';

export class XlsxResult {
    private _policy: Policy;
    private _schemas: Schema[];
    private _tools: PolicyTool[];
    private _errors: XlsxError[];
    private _enums: XlsxEnum[];
    private _toolsCache: Map<string, ITool>;
    private _linkCache: Map<string, ILink>;
    private _schemaCache: ISchemaCache[];

    constructor() {
        this._schemas = [];
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
        return this._schemas;
    }

    public get tools(): PolicyTool[] {
        return this._tools;
    }

    public addTool(
        worksheet: Worksheet,
        name: string,
        messageId: string
    ): void {
        this._toolsCache.set(messageId, {
            uuid: messageId,
            name: messageId,
            messageId: messageId
        });
        this._schemaCache.push({
            name,
            worksheet: worksheet.name,
            toolId: messageId
        });
    }

    public addSchema(
        worksheet: Worksheet,
        name: string,
        schema: Schema
    ): void {
        this._schemas.push(schema);
        this._schemaCache.push({
            name,
            worksheet: worksheet.name,
            iri: schema.iri
        });
    }

    public addError(
        error: XlsxError,
        target: SchemaField | Schema | SchemaCondition
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
                id: s.id,
                iri: s.iri,
                name: s.name,
                description: s.description,
                version: s.version,
                status: s.status
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
        } catch (error) {
            this.addError({
                type: 'error',
                text: 'Failed to parse file.',
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
            for (const schema of this._schemas) {
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
                schema.updateRefs(this._schemas);
            }
        } catch (error) {
            this.addError({
                type: 'error',
                text: 'Failed to parse file.',
                message: error?.toString()
            }, null);
        }
    }

    public addEnum(item: XlsxEnum): void {
        this._enums.push(item);
    }

    public getEnum(worksheet: string): string[] {
        for (const item of this._enums) {
            if(item.worksheet.name === worksheet) {
                return item.data;
            }
        }

    }
}
