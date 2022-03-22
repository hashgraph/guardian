import { MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { HcsDidRootKey } from '@hashgraph/did-sdk-js';
import { Schema } from '@entity/schema';
import { MongoRepository } from 'typeorm';
import { DidDocument } from '@entity/did-document';
import { Logger } from 'logger-helper';

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
                res.send(new MessageResponse(didDocuments.document));
                return;
            }
            res.send(new MessageError('Document not found'));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error.message));
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
                res.send(new MessageError('Document not found'));
                return;
            }

            if (Array.isArray(msg.payload)) {
                const schema = await schemaRepository.find({
                    where: { documentURL: { $in: msg.payload } }
                });
                res.send(new MessageResponse(schema));
            } else {
                const schema = await schemaRepository.findOne({
                    where: { documentURL: { $eq: msg.payload } }
                });
                res.send(new MessageResponse(schema));
            }
        }
        catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error.message));
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
                res.send(new MessageError('Document not found'))
                return;
            }
            if (Array.isArray(msg.payload)) {
                const schema = await schemaRepository.find({
                    where: { contextURL: { $in: msg.payload } }
                });
                res.send(new MessageResponse(schema));
            } else {
                const schema = await schemaRepository.findOne({
                    where: { contextURL: { $eq: msg.payload } }
                });
                res.send(new MessageResponse(schema));
            }
        }
        catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error.message));
        }
    });
}