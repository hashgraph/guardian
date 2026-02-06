import { IRecordResult } from '@guardian/common';
import { CompareOptions } from '../compare/interfaces/index.js';
import { DocumentModel, RecordModel, SchemaModel, VcDocumentModel, VpDocumentModel } from '../compare/models/index.js';
import { SchemaCache } from './schema-cache.js';

/**
 * Loader
 */
export class RecordLoader {
    private readonly options: CompareOptions;
    private readonly cacheSchemas: SchemaCache;

    constructor(options: CompareOptions) {
        this.options = options;
        this.cacheSchemas = new SchemaCache(options);
    }

    /**
     * Create document model
     * @param id
     * @param options
     * @public
     */
    public async loadSchemas(document: DocumentModel): Promise<SchemaModel[]> {
        const schemaModels: SchemaModel[] = [];
        const schemasIds = document.getSchemas();
        const types = document.getTypes();
        const type = types[0];
        for (const schemasId of schemasIds) {
            const cacheModel = this.cacheSchemas.getSchemaCache(schemasId, type);
            if (cacheModel) {
                if (!cacheModel.empty) {
                    schemaModels.push(cacheModel);
                }
            } else {
                const schemaModel = await this.cacheSchemas.loadSchema(schemasId, type);
                this.cacheSchemas.addSchemaCache(schemasId, schemaModel, type);
                if (!schemaModel.empty) {
                    schemaModels.push(schemaModel);
                }
            }
        }
        return schemaModels;
    }

    /**
     * Create policy model
     * @param documents
     * @param options
     */
    public async createModel(documents: IRecordResult[]): Promise<RecordModel> {
        const model = new RecordModel(this.options);
        model.setDocuments(documents);

        const children: DocumentModel[] = [];
        for (const document of documents) {
            if (document.type === 'schema' && document.document) {
                const schemaModel = SchemaModel.from(document.document, this.options);
                schemaModel.update(this.options);
                this.cacheSchemas.addSchemaCache(document.id, schemaModel, schemaModel.iri);
            }
        }
        for (let index = 0; index < documents.length; index++) {
            const document = documents[index];
            if (document.type === 'vc') {
                const child = VcDocumentModel.from(document.document, this.options);
                const schemaModels = await this.loadSchemas(child);
                child.setAttributes(index);
                child.setRelationships([]);
                child.setSchemas(schemaModels);
                child.update(this.options);
                children.push(child);
            }
            if (document.type === 'vp') {
                const child = VpDocumentModel.from(document.document, this.options);
                const schemaModels = await this.loadSchemas(child);
                child.setAttributes(index);
                child.setRelationships([]);
                child.setSchemas(schemaModels);
                child.update(this.options);
                children.push(child);
            }
        }
        model.setChildren(children);

        //Compare
        model.update(this.options);

        return model;
    }
}
