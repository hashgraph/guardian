import { ApiResponse } from '../api/helpers/api-response.js';
import { Environment } from '@guardian/common/helpers/environment';
import { IAuthUser } from '@guardian/common/interfaces/auth.interface';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { PinoLogger } from '@guardian/common/helpers/pino-logger';
import { SecretManager } from '@guardian/common/secret-manager/secret-manager';
import { ValidateConfiguration } from '@guardian/common/helpers/validate-configuration';
import { Workers } from '@guardian/common/helpers/workers';
import { CommonSettings, MessageAPI } from '@guardian/interfaces';
import { AccountId, PrivateKey } from '@hiero-ledger/sdk';

/**
 * Connecting to the message broker methods of working with root address book.
 */
export async function configAPI(logger: PinoLogger): Promise<void> {
    /**
     * Update settings
     *
     */
    ApiResponse(MessageAPI.UPDATE_SETTINGS,
        async (msg: {
            user: IAuthUser,
            settings: CommonSettings
        }) => {
            try {
                const { user, settings } = msg;
                const secretManager = SecretManager.New();
                try {
                    AccountId.fromString(settings.operatorId);
                } catch (error) {
                    await logger.error('OPERATOR_ID: ' + error.message, ['GUARDIAN_SERVICE'], user.id);
                    throw new Error('OPERATOR_ID: ' + error.message);
                }
                try {
                    PrivateKey.fromString(settings.operatorKey);
                } catch (error) {
                    await logger.error('OPERATOR_KEY: ' + error.message, ['GUARDIAN_SERVICE'], user.id);
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    /**
     * Get settings
     */
    ApiResponse(MessageAPI.GET_SETTINGS, async (msg: {
        user: IAuthUser
    }) => {
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
            await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.GET_ENVIRONMENT, async (_: any) => {
        return new MessageResponse(Environment.network);
    })
}
