import { ApiResponse } from '@api/api-response';
import {
    MessageResponse,
    MessageError,
    Logger,
} from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';

/**
 * Connect to the message broker methods of working with map.
 *
 * @param channel - channel
 */
export async function mapAPI(): Promise<void> {
    /**
     * Get map api token
     *
     * @param {any} msg - Get artifact parameters
     *
     * @returns {any} Artifacts and count
     */
    ApiResponse(MessageAPI.GET_MAP_API_KEY, async (msg) => {
        try {
            return new MessageResponse(process.env.MAP_API_KEY || '');
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
