import { ISchema } from '@guardian/interfaces';
import { Schema } from '../entity/index.js';
import { DocumentLoader, IDocumentFormat } from '../hedera-modules/index.js';
import { DatabaseServer } from '../database-modules/index.js';

/**
 * Schema Documents Loader.
 * Used for schema validation.
 */
export class LocalSchemaContextLoader extends DocumentLoader {
    dataBaseServer: DatabaseServer

    constructor() {
        super();
        this.dataBaseServer =  new DatabaseServer()
    }

    /**
     * Get document format
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        return {
            documentUrl: iri,
            document: await this.getDocument(iri),
        };
    }

    /**
     * Get document
     * @param iri
     */
    public async getDocument(iri: string): Promise<any> {
        const schema = await this.loadSchemaContext(iri);
        if (!schema) {
            throw new Error(`Schema not found: ${iri}`);
        }
        if (!schema.context) {
            throw new Error(`Context not found: ${iri}`);
        }

        if ("@vocab" in schema.context["@context"]) {
            schema.context["@context"]["@vocab"] = 'https://w3id.org/traceability/#undefinedTerm';
        }

        return schema.context;
    }

    /**
     * Load schema context
     * @param contextURL
     * @private
     */
    private async loadSchemaContext(contextURL: string): Promise<ISchema> {
        try {
            if (!contextURL) {
                return null;
            }
            const test = await this.dataBaseServer.findOne(Schema, { contextURL });

            return test;
        }
        catch (error) {
            return null;
        }
    }
}
