import { DatabaseServer, IRecordResult } from '@guardian/common';
import { CompareOptions } from '../compare/interfaces/index.js';
import { DocumentModel, RecordModel, SchemaModel, VcDocumentModel, VpDocumentModel } from '../compare/models/index.js';

/**
 * Loader
 */
export class RecordLoader {
    private readonly cacheSchemas: Map<string, SchemaModel | null>;
    private readonly options: CompareOptions;

    constructor(options: CompareOptions) {
        this.options = options;
        this.cacheSchemas = new Map<string, SchemaModel>();
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
        for (const schemasId of schemasIds) {
            let iri = schemasId?.replace('schema#', '#');
            iri = schemasId?.replace('schema:', '#');
            if (this.cacheSchemas.has(schemasId)) {
                const schemaModel = this.cacheSchemas.get(schemasId);
                if (schemaModel) {
                    schemaModels.push(schemaModel);
                }
            } else if (this.cacheSchemas.has(iri)) {
                const schemaModel = this.cacheSchemas.get(iri);
                if (schemaModel) {
                    schemaModels.push(schemaModel);
                }
            } else {
                const schema = (schemasId.startsWith('schema#') || schemasId.startsWith('schema:')) ?
                    await DatabaseServer.getSchema({ iri }) :
                    await DatabaseServer.getSchema({ contextURL: schemasId });
                if (schema) {
                    const schemaModel = new SchemaModel(schema, this.options);
                    schemaModel.update(this.options);
                    schemaModels.push(schemaModel);
                    this.cacheSchemas.set(schemasId, schemaModel);
                } else {
                    this.cacheSchemas.set(schemasId, null);
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
            if (document.type === 'schema') {
                const schemaModel = SchemaModel.from(document.document, this.options);
                schemaModel.update(this.options);
                this.cacheSchemas.set(document.id, schemaModel);
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
