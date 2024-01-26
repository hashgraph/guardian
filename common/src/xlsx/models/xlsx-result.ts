import { Hyperlink, Worksheet } from './workbook';
import { ISchema, Schema, SchemaCondition, SchemaField } from '@guardian/interfaces';
import { XlsxError } from '../interfaces/error.interface';
import { Policy, PolicyTool } from '../../entity';
import { ICache } from '../interfaces/cache.interface';
import { ITool } from '../interfaces/tool.interface';
import { ILink } from '../interfaces/link.interface';

export class XlsxResult {
    private _policy: Policy;
    private _schemas: Schema[];
    private _tools: PolicyTool[];
    private _errors: XlsxError[];
    private _toolsCache: Map<string, ITool>;
    private _schemaWorksheetCache: Map<string, ICache>;
    private _schemaNameCache: Map<string, ICache>;
    private _linkCache: Map<string, ILink>;

    constructor() {
        this._schemas = [];
        this._tools = [];
        this._errors = [];
        this._schemaWorksheetCache = new Map<string, ICache>();
        this._schemaNameCache = new Map<string, ICache>();
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
        const cache: ICache = {
            name: name,
            toolId: messageId,
        };
        this._schemaWorksheetCache.set(worksheet.name, cache);
        this._schemaNameCache.set(`tool-schema:${name}`, cache);
    }

    public addSchema(
        worksheet: Worksheet,
        name: string,
        schema: Schema
    ): void {
        this._schemas.push(schema);
        const cache: ICache = {
            name: name,
            iri: schema.iri,
        };
        this._schemaWorksheetCache.set(worksheet.name, cache);
        this._schemaNameCache.set(name, cache);
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
        this._toolsCache.clear();
        this._schemaWorksheetCache.clear();
        this._schemaNameCache.clear();
        this._linkCache.clear();
    }

    public getToolIds(): ITool[] {
        return Array.from(this._toolsCache.values());
    }

    private getSubSchema(field: SchemaField): string {
        if (field.type === '#GeoJSON') {
            return '#GeoJSON';
        }
        const link = this._linkCache.get(field.type);
        if (link) {
            let cache: ICache;
            if (link.worksheet) {
                cache = this._schemaWorksheetCache.get(link.worksheet);
            }
            if (!cache && link.name) {
                cache =
                    this._schemaNameCache.get(link.name) ||
                    this._schemaNameCache.get(`tool-schema:${link.name}`);
            }
            if (cache && cache.iri) {
                return cache.iri;
            }
        }
        console.debug(' --- error ', JSON.stringify(field, null, 4));
        this.addError({
            type: 'error',
            text: `Sub-schema (${field.type}) not found.`,
            message: `Sub-schema (${field.type}) not found.`,
            worksheet: ''
        }, field);
        return null;
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
            for (const cache of this._schemaWorksheetCache.values()) {
                if (cache.toolId === tool.messageId) {
                    const schema = schemas.find(s => s.name === cache.name);
                    cache.iri = schema?.iri;
                }
            }
            for (const cache of this._schemaNameCache.values()) {
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

    public updateSchemas(): void {
        try {
            for (const schema of this._schemas) {
                for (const field of schema.fields) {
                    if (field.isRef) {
                        field.type = this.getSubSchema(field);
                    }
                }
                schema.updateDocument();
                schema.updateRefs(this._schemas);
            }
        } catch (error) {
            console.debug(' --- updateSchemas error ', error);
            this.addError({
                type: 'error',
                text: 'Failed to parse file.',
                message: error?.toString()
            }, null);
        }
    }
}
