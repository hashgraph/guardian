import { Schema } from '@guardian/interfaces';
import { ModuleVariable } from './module-variable.model';

export class SchemaVariables {
    public name?: string;
    public value?: string;
    public version?: string;
    public sourceVersion?: string;
    public status?: string;
    public data?: Schema;

    constructor(schema?: Schema | ModuleVariable | string, value?: string, baseSchema?: Schema) {
        if (typeof schema === 'string') {
            this.name = schema;
            this.value = schema;
        } else if (schema instanceof ModuleVariable) {
            this.name = schema.name;
            this.value = schema.name;
            this.data = baseSchema;
        } else if (schema) {
            this.name = schema.name;
            this.version = schema.version;
            this.sourceVersion = schema.sourceVersion;
            this.status = schema.status;
            this.value = schema.iri;
            this.data = schema;
        } else {
            this.name = '';
            this.value = '';
        }
        if (value !== undefined) {
            this.value = value;
        }
    }
}
