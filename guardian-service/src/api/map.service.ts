import { ApiResponse } from '../api/helpers/api-response.js';
import { IAuthUser, MessageError, MessageResponse, PinoLogger } from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';

/**
 * Connect to the message broker methods of working with map.
 */
export async function mapAPI(logger: PinoLogger): Promise<void> {
    /**
     * Get map api token
     *
     * @param {any} msg - Get artifact parameters
     *
     * @returns {any} Artifacts and count
     */
    ApiResponse(MessageAPI.GET_MAP_API_KEY, async (msg: {
        user: IAuthUser
    }) => {
        try {
            return new MessageResponse(process.env.MAP_API_KEY || '');
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.GET_SENTINEL_API_KEY, async (msg: {
        user: IAuthUser
    }) => {
        try {
            return new MessageResponse(process.env.GET_SENTINEL_API_KEY || '');
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
            return new MessageError(error);
        }
    });
}
