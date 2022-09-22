import { Settings } from '@entity/settings';
import { Topic } from '@entity/topic';
import { ApiResponse } from '@api/api-response';
import {
    MessageBrokerChannel,
    MessageResponse,
    MessageError,
    Logger,
    DataBaseHelper, SettingsContainer
} from '@guardian/common';
import { MessageAPI, CommonSettings } from '@guardian/interfaces';
import { Environment } from '@hedera-modules';

/**
 * Connecting to the message broker methods of working with root address book.
 *
 * @param channel - channel
 * @param approvalDocumentRepository - table with approve documents
 */
export async function configAPI(
    channel: MessageBrokerChannel,
    settingsRepository: DataBaseHelper<Settings>,
    topicRepository: DataBaseHelper<Topic>,
): Promise<void> {
    ApiResponse(channel, MessageAPI.GET_TOPIC, async (msg) => {
        const topic = await topicRepository.findOne(msg);
        return new MessageResponse(topic);
    });

    /**
     * Update settings
     *
     */
    ApiResponse(channel, MessageAPI.UPDATE_SETTINGS, async (settings: CommonSettings) => {
        try {
            const settingsContainer = new SettingsContainer();
            await settingsContainer.updateSetting('OPERATOR_ID', settings.operatorId);
            await settingsContainer.updateSetting('OPERATOR_KEY', settings.operatorKey)

            return new MessageResponse(null);
        }
        catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Get settings
     */
    ApiResponse(channel, MessageAPI.GET_SETTINGS, async (msg) => {
        try {
            const settingsContainer = new SettingsContainer();
            const { OPERATOR_ID } = settingsContainer.settings;

            return new MessageResponse({
                operatorId: OPERATOR_ID,
                // operatorKey: OPERATOR_KEY
                operatorKey: ''
            });
        }
        catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.GET_ENVIRONMENT, async (msg) => {
        return new MessageResponse(Environment.network);
    })
}
