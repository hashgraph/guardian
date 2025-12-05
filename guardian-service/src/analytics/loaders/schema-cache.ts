import { DatabaseServer } from '@guardian/common';
import { CompareOptions } from '../compare/interfaces/index.js';
import { SchemaModel } from '../compare/models/index.js';

export class SchemaCache {
    private readonly options: CompareOptions;
    private readonly cacheSchemas: Map<string, SchemaModel[]>;

    constructor(options: CompareOptions) {
        this.options = options;
        this.cacheSchemas = new Map<string, SchemaModel[]>();
    }

    private parseSchemaId(schemasId: string, type: string) {
        let contextURL = '';
        let iri = '';
        if (schemasId.startsWith('#')) {
            contextURL = '';
            iri = schemasId;
        } else if (schemasId.startsWith('schema#')) {
            contextURL = '';
            iri = schemasId.replace('schema#', '#');
        } else {
            const components = schemasId.split('#');
            contextURL = components[0];
            if (components[1]) {
                iri = `#${components[1]}`;
            } else {
                iri = components[0].replace('schema:', '#');
            }
        }
        const typeId = type.startsWith('#') ? type : `#${type}`;
        return { contextURL, iri, typeId };
    }

    public getSchemaCache(schemasId: string, type: string): SchemaModel | null {
        if (!schemasId) {
            return null;
        }
        const { contextURL, iri, typeId } = this.parseSchemaId(schemasId, type);
        let schemas: SchemaModel[] | undefined = this.cacheSchemas.get(schemasId);
        if (!schemas) {
            schemas = this.cacheSchemas.get(contextURL);
        }
        if (!schemas) {
            schemas = this.cacheSchemas.get(iri);
        }
        if (!schemas) {
            schemas = this.cacheSchemas.get(typeId);
        }
        if (schemas) {
            for (const schema of schemas) {
                if (schema.iri === typeId) {
                    return schema;
                }
            }
        }
        return null;
    }

    public addSchemaCache(id: string, model: SchemaModel, type: string): void {
        if (!id) {
            return;
        }
        const { contextURL, iri, typeId } = this.parseSchemaId(id, type);
        const fullId = contextURL || iri || typeId;
        const schemas = this.cacheSchemas.get(fullId) || [];
        schemas.push(model);
        this.cacheSchemas.set(fullId, schemas);
    }

    public async loadSchema(schemasId: string, type: string): Promise<SchemaModel> {
        const { contextURL, iri, typeId } = this.parseSchemaId(schemasId, type);
        let schema: any;
        if (contextURL) {
            schema = await DatabaseServer.getSchema({ contextURL, iri: typeId });
        } else if (iri) {
            schema = await DatabaseServer.getSchema({ iri });
        } else {
            schema = await DatabaseServer.getSchema({ iri: typeId });
        }
        if (schema) {
            const schemaModel = new SchemaModel(schema, this.options);
            schemaModel.update(this.options);
            return schemaModel;
        } else {
            return SchemaModel.empty(type, this.options);
        }
    }
}
