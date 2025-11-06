import { DatabaseServer } from '@guardian/common';
import { CompareOptions, IRefLvl, IVcDocument, IVpDocument } from '../compare/interfaces/index.js';
import { DocumentModel, SchemaModel, VcDocumentModel, VpDocumentModel } from '../compare/models/index.js';
import { SchemaCache } from './schema-cache.js';

/**
 * Loader
 */
export class DocumentLoader {
    private readonly cacheDocuments: Map<string, DocumentModel | null>;
    private readonly cacheSchemas: SchemaCache;
    private readonly options: CompareOptions;

    constructor(options: CompareOptions) {
        this.options = options;
        this.cacheDocuments = new Map<string, DocumentModel>();
        this.cacheSchemas = new SchemaCache(options);
    }

    /**
     * Load document
     * @param ref
     */
    public async loadDocumentsByRef(ref: string): Promise<(IVcDocument | IVpDocument)[]> {
        let document: (IVcDocument | IVpDocument)[];

        const filter = this.options.owner ? {
            $or: [{
                relationships: ref,
                messageId: { $exists: true, $ne: null }
            }, {
                relationships: ref,
                owner: this.options.owner
            }]
        } : {
            relationships: ref,
            messageId: { $exists: true, $ne: null }
        };

        document = await DatabaseServer.getVCs(filter);

        if (document && document.length) {
            return document;
        }

        document = await DatabaseServer.getVPs(filter);

        if (document && document.length) {
            return document;
        }

        return [];
    }

    /**
     * Load document
     * @param id
     */
    public async loadDocument(id: string): Promise<DocumentModel> {
        let document: IVcDocument | IVpDocument;

        document = await DatabaseServer.getVCById(id);

        if (document) {
            if (!this.options.owner || document.messageId || this.options.owner === document.owner) {
                return new VcDocumentModel(document, this.options);
            } else {
                return null;
            }
        }

        document = await DatabaseServer.getVC({ messageId: id });

        if (document) {
            if (!this.options.owner || document.messageId || this.options.owner === document.owner) {
                return new VcDocumentModel(document, this.options);
            } else {
                return null;
            }
        }

        document = await DatabaseServer.getVPById(id);

        if (document) {
            if (!this.options.owner || document.messageId || this.options.owner === document.owner) {
                return new VpDocumentModel(document, this.options);
            } else {
                return null;
            }
        }

        document = await DatabaseServer.getVP({ messageId: id });

        if (document) {
            if (!this.options.owner || document.messageId || this.options.owner === document.owner) {
                return new VpDocumentModel(document, this.options);
            } else {
                return null;
            }
        }

        return null;
    }

    /**
     * Create document model
     * @param documentModel
     * @param options
     */
    public async createRelationships(documentModel: DocumentModel): Promise<void> {
        if (this.options.refLvl === IRefLvl.None) {
            //None (old 0)
            documentModel.setRelationships([]);
            return;
        }

        if (this.options.refLvl === IRefLvl.Revert) {
            //Revert (old 1)
            const documents = await this.loadDocumentsByRef(documentModel.messageId);
            const relationshipModels: DocumentModel[] = [];
            for (const doc of documents) {
                const item = await this.createDocument(doc.id);
                if (item) {
                    relationshipModels.push(item);
                }
            }
            documentModel.setRelationships(relationshipModels);
        } else if (this.options.refLvl === IRefLvl.Direct) {
            const relationshipModels: DocumentModel[] = [];
            for (const relationship of documentModel.relationshipIds) {
                const item = await this.createDocument(relationship);
                if (item) {
                    relationshipModels.push(item);
                }
            }
            documentModel.setRelationships(relationshipModels);
        } else if (this.options.refLvl === IRefLvl.Merge) {
            //Merge (old 2)
            const documents = await this.loadDocumentsByRef(documentModel.messageId);
            const relationshipModels: DocumentModel[] = [];
            for (const doc of documents) {
                const item = await this.createDocument(doc.id);
                if (item) {
                    relationshipModels.push(item);
                }
            }
            documentModel.merge(relationshipModels);
        } else {
            //Default
            const relationshipModels: DocumentModel[] = [];
            for (const relationship of documentModel.relationshipIds) {
                const item = await this.createDocument(relationship);
                if (item) {
                    relationshipModels.push(item);
                }
            }
            documentModel.setRelationships(relationshipModels);
        }
    }

    /**
     * Create document model
     * @param id
     */
    public async createDocument(id: string): Promise<DocumentModel> {
        if (this.cacheDocuments.has(id)) {
            return this.cacheDocuments.get(id);
        }

        const documentModel = await this.loadDocument(id);
        this.cacheDocuments.set(id, documentModel);

        if (!documentModel) {
            return null;
        }

        //Relationships
        await this.createRelationships(documentModel);

        //Schemas
        const schemaModels: SchemaModel[] = [];
        const schemasIds = documentModel.getSchemas();
        const types = documentModel.getTypes();
        const type = types[0];
        for (const schemasId of schemasIds) {
            const schemaModel = await this.createSchema(schemasId, type);
            if (schemaModel) {
                schemaModels.push(schemaModel);
            }
        }
        documentModel.setSchemas(schemaModels);

        //Compare
        documentModel.update(this.options);

        return documentModel;
    }

    /**
     * Create schema model
     * @param schemasId
     */
    public async createSchema(schemasId: string, type: string): Promise<SchemaModel | null> {
        const cacheModel = this.cacheSchemas.getSchemaCache(schemasId, type);
        if (cacheModel) {
            if (!cacheModel.empty) {
                return cacheModel;
            } else {
                return null;
            }
        }
        const schemaModel = await this.cacheSchemas.loadSchema(schemasId, type);
        this.cacheSchemas.addSchemaCache(schemasId, schemaModel, type);
        if (!schemaModel.empty) {
            return schemaModel;
        } else {
            return null;
        }
    }
}
