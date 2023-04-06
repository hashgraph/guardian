import { Schema } from '@guardian/interfaces';
import { ModuleVariableModel } from '../module-variable.model';

export class SchemaVariables {
    public name?: string;
    public value?: string;
    public version?: string;
    public status?: string;
    public data?: Schema;

    constructor(schema?: Schema | ModuleVariableModel | string, value?: string) {
        if (typeof schema === 'string') {
            this.name = schema;
            this.value = schema;
        } else if(schema instanceof ModuleVariableModel) {
            this.name = schema.name;
            this.value = schema.name;
        } else if (schema) {
            this.name = schema.name;
            this.version = schema.version;
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
