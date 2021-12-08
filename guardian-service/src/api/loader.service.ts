import { DIDDocumentLoader } from 'document-loader/did-document-loader';
import { SchemaObjectLoader } from 'document-loader/schema-loader';
import { SchemaDocumentLoader } from 'document-loader/vc-document-loader';
import { MessageAPI } from 'interfaces';

/**
 * Connect to the message broker methods of working with Documents Loader.
 * 
 * @param channel - channel
 * @param didDocumentLoader - DID Documents Loader
 * @param schemaDocumentLoader - Schema Documents Loader
 */
export const loaderAPI = async function (
    channel: any,
    didDocumentLoader: DIDDocumentLoader,
    schemaDocumentLoader: SchemaDocumentLoader,
    schemaObjectLoader: SchemaObjectLoader
): Promise<void> {
    /**
     * Return DID Document
     * 
     * @param {Object} payload - filters
     * @param {string} payload.did - DID
     * 
     * @returns {any} - DID Document
     */
    channel.response(MessageAPI.LOAD_DID_DOCUMENT, async (msg, res) => {
        try {
            const documents = await didDocumentLoader.getDocument(msg.payload.did)
            res.send(documents);
        } catch (e) {
            res.send(null);
        }
    });

    /**
     * Return Schema Document
     * 
     * @param {string} [payload] - schema type
     * 
     * @returns {any} - Schema Document
     */
    channel.response(MessageAPI.LOAD_SCHEMA_DOCUMENT, async (msg, res) => {
        try {
            let documents: any;
            if (msg.payload) {
                const uuid = msg.payload as string;
                documents = await schemaDocumentLoader.getDocument(uuid);
            } else {
                documents = await schemaDocumentLoader.getDocument();
            }
            res.send(documents);
        } catch (e) {
            res.send(null);
        }
    });
    /**
     * 
     * Return Schema
     * 
     * @param {string} [payload] - schema type
     * 
     * @returns {any} - Schema Document
     */
    channel.response(MessageAPI.LOAD_SCHEMA, async (msg, res) => {
        try {
            const uuid = msg.payload as string;
            const documents = await schemaObjectLoader.get(uuid);
            res.send(documents);
        } catch (e) {
            res.send(null);
        }
    });
}