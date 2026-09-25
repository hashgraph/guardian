import { DidURL } from './did-url.js';
import { DocumentLoader } from './base/document-loader.js';
import { IDocumentFormat } from './base/document-format.js';
import { DidDocument } from '../entity/did-document.js';
import { DryRun } from '../entity/dry-run.js';
import { DatabaseServer } from '../database-modules/database-server.js';

/**
 * Dry Run loader
 */
export class DraftDidLoader extends DocumentLoader {
    dataBaseServer: DatabaseServer

    constructor() {
        super();
        this.dataBaseServer =  new DatabaseServer()
    }
    /**
     * Has context
     * @param iri
     */
    public async has(iri: string): Promise<boolean> {
        const did = DidURL.getController(iri);
        const document = await this.dataBaseServer.findOne(DryRun, {
            did,
            dryRunClass: 'DidDocumentCollection',
        });
        return !!document;
    }

    /**
     * Get formatted document
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        const did = DidURL.getController(iri);
        const document = await this.dataBaseServer.findOne(DryRun, {
            did,
            dryRunClass: 'DidDocumentCollection',
        });
        return {
            documentUrl: iri,
            document: document.document,
        };
    }

    /**
     * Get document
     * @param iri
     */
    public async getDocument(iri: string): Promise<any> {
        const did = DidURL.getController(iri);
        const didDocuments = await this.dataBaseServer.findOne(DidDocument, {
            did,
        });
        if (didDocuments) {
            return didDocuments.document;
        }
        throw new Error(`DID not found: ${iri}`);
    }
}
