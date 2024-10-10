import { Schema, SchemaHelper } from '@guardian/interfaces';
import { ModuleVariable } from './module-variable.model';

export class SchemaVariables {
    public name: string;
    public value: string;
    public version?: string;
    public sourceVersion?: string;
    public status?: string;
    public statusLabel?: string;
    public data?: Schema;
    public disable: boolean;
    public defs: string[];

    constructor(
        schema?: Schema | ModuleVariable | string,
        value?: string,
        baseSchema?: Schema
    ) {
        this.disable = false;
        this.defs = [];
        if (typeof schema === 'string') {
            this.name = schema;
            this.value = schema;
            this.status = 'VARIABLE';
        } else if (schema instanceof ModuleVariable) {
            this.name = schema.name;
            this.value = schema.name;
            this.data = baseSchema;
            this.status = 'VARIABLE';
        } else if (schema) {
            this.name = schema.name || '';
            this.version = schema.version;
            this.sourceVersion = schema.sourceVersion;
            this.value = schema.iri || '';
            this.data = schema;
            this.status = schema.status;
            const defs = schema?.document?.$defs;
            if (defs && Object.prototype.toString.call(defs) === '[object Object]') {
                this.defs = Object.keys(defs);
            }
        } else {
            this.name = '';
            this.value = '';
        }
        if (value !== undefined) {
            this.value = value;
        }
        this.statusLabel = this.getStatusLabel(this.status);
    }

    private getStatusLabel(status?: string): string | undefined {
        if (status === 'VARIABLE') return 'Variable';
        if (status === 'TOOL') return 'Tool';
        if (status === 'ERROR') return 'Incomplete';
        if (status === 'DRAFT') return 'Draft';
        if (status === 'PUBLISHED') return 'Published';
        if (status === 'UNPUBLISHED') return 'Unpublished';
        return status;
    }

    public get displayName(): string {
        return SchemaHelper.getSchemaName(this.name, this.sourceVersion || this.version, this.statusLabel);
    }

    public get tooltip(): string {
        return SchemaHelper.getSchemaName(this.name, this.version || this.sourceVersion, this.statusLabel);
    }
}
