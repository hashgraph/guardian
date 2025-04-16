import { ApiResponse } from '../api/helpers/api-response.js';
import { DatabaseServer, Environment, MessageError, MessageResponse, PinoLogger, SecretManager, Topic, ValidateConfiguration, Workers } from '@guardian/common';
import { CommonSettings, MessageAPI } from '@guardian/interfaces';
import { AccountId, PrivateKey } from '@hashgraph/sdk';

/**
 * Connecting to the message broker methods of working with root address book.
 */
export async function configAPI(
    dataBaseServer: DatabaseServer,
    logger: PinoLogger,
): Promise<void> {

    ApiResponse(MessageAPI.GET_TOPIC, async (msg) => {
        const topic = await dataBaseServer.findOne(Topic, msg);
        return new MessageResponse(topic);
    });

    /**
     * Update settings
     *
     */
    ApiResponse(MessageAPI.UPDATE_SETTINGS, async ({settings} :{settings: CommonSettings & { userId: string }}) => {
        const userId = settings?.userId
        try {
            const secretManager = SecretManager.New();
            try {
                AccountId.fromString(settings.operatorId);
            } catch (error) {
                await logger.error('OPERATOR_ID: ' + error.message, ['GUARDIAN_SERVICE'], userId);
                throw new Error('OPERATOR_ID: ' + error.message);
            }
            try {
                PrivateKey.fromString(settings.operatorKey);
            } catch (error) {
                await logger.error('OPERATOR_KEY: ' + error.message, ['GUARDIAN_SERVICE'], userId);
                throw new Error('OPERATOR_KEY: ' + error.message);
            }

            await secretManager.setSecrets('keys/operator', {
                OPERATOR_ID: settings.operatorId,
                OPERATOR_KEY: settings.operatorKey
            });
            const validator = new ValidateConfiguration();
            await validator.validate();
            await new Workers().updateSettings({
                ipfsStorageApiKey: settings.ipfsStorageApiKey
            });
            return new MessageResponse(null);
        }
        catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE'], userId);
            return new MessageError(error);
        }
    });

    /**
     * Get settings
     */
    ApiResponse(MessageAPI.GET_SETTINGS, async (msg: any) => {
        const userId = msg?.userId
        try {
            const secretManager = SecretManager.New();
            const { OPERATOR_ID } = await secretManager.getSecrets('keys/operator');

            return new MessageResponse({
                operatorId: OPERATOR_ID,
                // operatorKey: OPERATOR_KEY
                operatorKey: '',
                ipfsStorageApiKey: ''
            });
        }
        catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE'], userId);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.GET_ENVIRONMENT, async (_: any) => {
        return new MessageResponse(Environment.network);
    })
}
