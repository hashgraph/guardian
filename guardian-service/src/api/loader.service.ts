import { DIDDocumentLoader } from 'document-loader/did-document-loader';
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
    schemaDocumentLoader: SchemaDocumentLoader
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
                documents = await schemaDocumentLoader.getDocument(msg.payload)
            } else {
                documents = await schemaDocumentLoader.getDocument()
            }
            res.send(documents);
        } catch (e) {
            res.send(null);
        }
    });
}