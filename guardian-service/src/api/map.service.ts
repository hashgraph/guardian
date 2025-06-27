import { ApiResponse } from '../api/helpers/api-response.js';
import { IAuthUser, MessageError, MessageResponse, PinoLogger } from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';

/**
 * Connect to the message broker methods of working with map.
 */
export async function mapAPI(logger: PinoLogger): Promise<void> {
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
