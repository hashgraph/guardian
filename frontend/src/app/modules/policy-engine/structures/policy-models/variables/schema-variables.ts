import { Schema, SchemaHelper } from '@guardian/interfaces';
import { ModuleVariable } from './module-variable.model';

export class SchemaVariables {
    public name: string;
    public value: string;
    public version?: string;
    public sourceVersion?: string;
    public status?: string;
    public data?: Schema;

    constructor(
        schema?: Schema | ModuleVariable | string,
        value?: string,
        baseSchema?: Schema
    ) {
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
            this.status = schema.status;
            this.value = schema.iri || '';
            this.data = schema;
        } else {
            this.name = '';
            this.value = '';
        }
        if (value !== undefined) {
            this.value = value;
        }
    }

    public get displayName(): string {
        return SchemaHelper.getSchemaName(this.name, this.sourceVersion || this.version, this.status);
    }

    public get tooltip(): string {
        return SchemaHelper.getSchemaName(this.name, this.version || this.sourceVersion, this.status);
    }
}
