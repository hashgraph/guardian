import { DIDDocumentLoader } from 'document-loader/did-document-loader';
import { SchemaDocumentLoader } from 'document-loader/vc-document-loader';
import { MessageAPI } from 'interfaces';

export const loaderAPI = async function (
    channel: any,
    didDocumentLoader: DIDDocumentLoader,
    schemaDocumentLoader: SchemaDocumentLoader
): Promise<void> {
    channel.response(MessageAPI.LOAD_DID_DOCUMENT, async (msg, res) => {
        try {
            const documents = await didDocumentLoader.getDocument(msg.payload.did)
            res.send(documents);
        } catch (e) {
            res.send(null);
        }
    });

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