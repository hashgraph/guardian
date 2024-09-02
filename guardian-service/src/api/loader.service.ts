import { ApiResponse } from '../api/helpers/api-response.js';
import { DatabaseServer, DidDocument, DidURL, MessageError, MessageResponse, PinoLogger, Schema } from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';

/**
 * Connect to the message broker methods of working with Documents Loader.
 *
 * @param dataBaseServer - Data base server
 * @param logger - pino logger
 */
export async function loaderAPI(
    dataBaseServer: DatabaseServer,
    logger: PinoLogger,
): Promise<void> {
    /**
     * Return DID Document
     *
     * @param {Object} payload - filters
     * @param {string} payload.did - DID
     *
     * @returns {any} - DID Document
     */
    ApiResponse(MessageAPI.LOAD_DID_DOCUMENT, async (msg) => {
        try {
            const iri = msg.did;
            const did = DidURL.getController(iri);
            const reqObj = { did: { $eq: did } };
            const didDocuments = await dataBaseServer.findOne(DidDocument, reqObj);
            if (didDocuments) {
                return new MessageResponse(didDocuments.document);
            }
            return new MessageError('Document not found');
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Load schema document
     * @param {string} [payload.url] Document URL
     *
     * @returns Schema document
     */
    ApiResponse(MessageAPI.LOAD_SCHEMA_DOCUMENT, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Document not found');
            }

            if (Array.isArray(msg)) {
                const schema = await dataBaseServer.find(Schema, { documentURL: { $in: msg } });
                return new MessageResponse(schema);
            } else {
                const schema = await dataBaseServer.findOne(Schema,  { documentURL: { $eq: msg } });
                return new MessageResponse(schema);
            }
        }
        catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Get schema context
     * @param {string} [payload.url] Context URL
     *
     * @returns Schema context
     */
    ApiResponse(MessageAPI.LOAD_SCHEMA_CONTEXT, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Document not found');
            }
            if (Array.isArray(msg)) {
                const schema = await dataBaseServer.find(Schema, { contextURL: { $in: msg } });
                return new MessageResponse(schema);
            } else {
                const schema = await dataBaseServer.findOne(Schema, { contextURL: { $eq: msg } });
                return new MessageResponse(schema);
            }
        }
        catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
