import { ApplicationState, MessageBrokerChannel, MessageInitialization, MessageResponse } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';

/**
 * API response
 * @param channel
 * @param event
 * @param handleFunc
 * @constructor
 */
export function ApiResponse<T>(channel: MessageBrokerChannel, event: any, handleFunc: (msg) => Promise<MessageResponse<T>>): void {
    const state = new ApplicationState();
    channel.response(event, async (msg) => {
        if (![ApplicationStates.READY, ApplicationStates.BAD_CONFIGURATION].includes(state.getState())) {
            console.warn(`${state.getState()} state, waiting for ${ApplicationStates.READY} state, event ${event}`);
            return new MessageInitialization()
        }

        return await handleFunc(msg);
    })
}
