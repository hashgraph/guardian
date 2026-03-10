import { ApiResponse } from './helpers/api-response.js';
import { MessageError, MessageResponse, MockEvent, MockUpHelper, PinoLogger } from '@guardian/common';

export async function mockAPI(logger: PinoLogger): Promise<void> {
    ApiResponse('MOCK_EVENT_EXECUTE',
        async (event: MockEvent) => {
            try {
                const result = await MockUpHelper.execute(event);
                console.log('--- TEST', result)
                return new MessageResponse(result);
            } catch (error) {
                return new MessageError(error);
            }
        });
}
