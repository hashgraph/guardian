import { MessageAPI } from 'interfaces';
import { HcsDidRootKey } from '@hashgraph/did-sdk-js';
import { Schema } from '@entity/schema';
import { MongoRepository } from 'typeorm';
import { DidDocument } from '@entity/did-document';

/**
 * Connect to the message broker methods of working with Documents Loader.
 * 
 * @param channel - channel
 * @param didDocumentLoader - DID Documents Loader
 * @param schemaDocumentLoader - Schema Documents Loader
 */
export const loaderAPI = async function (
    channel: any,
    didDocumentRepository: MongoRepository<DidDocument>,
    schemaRepository: MongoRepository<Schema>
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
            const iri = msg.payload.did;
            const did = HcsDidRootKey.fromId(iri).getController();
            const reqObj = { where: { did: { $eq: did } } };
            const didDocuments = await didDocumentRepository.findOne(reqObj);
            if (didDocuments) {
                res.send(didDocuments.document);
                return;
            }
            res.send(null);  
        } catch (e) {
            res.send(null);
        }
    });

    /**
     * Load schema document
     * @param {string} [payload.url] Document URL
     * 
     * @returns Schema document
     */
    channel.response(MessageAPI.LOAD_SCHEMA_DOCUMENT, async (msg, res) => {
        try {
            if (!msg.payload) {
                res.send(null)
                return;
            }

            if (Array.isArray(msg.payload)) {
                const schema = await schemaRepository.find({
                    where: { documentURL: { $in: msg.payload } }
                });
                res.send(schema);
            } else {
                const schema = await schemaRepository.findOne({
                    where: { documentURL: { $eq: msg.payload } }
                });
                res.send(schema);
            }
        }
        catch (error) {
            res.send(null);
        }
    });

    /**
     * Get schema context
     * @param {string} [payload.url] Context URL
     * 
     * @returns Schema context
     */
    channel.response(MessageAPI.LOAD_SCHEMA_CONTEXT, async (msg, res) => {
        try {
            if (!msg.payload) {
                res.send(null)
                return;
            }
            if (Array.isArray(msg.payload)) {
                const schema = await schemaRepository.find({
                    where: { contextURL: { $in: msg.payload } }
                });
                res.send(schema);
            } else {
                const schema = await schemaRepository.findOne({
                    where: { contextURL: { $eq: msg.payload } }
                });
                res.send(schema);
            }
        }
        catch (error) {
            res.send(null);
        }
    });
}