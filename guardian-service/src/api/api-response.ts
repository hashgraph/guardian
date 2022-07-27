import { MessageBrokerChannel, MessageResponse, ApplicationState, MessageInitialization } from '@guardian/common';
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
        if (state.getState() !== ApplicationStates.READY) {
            console.warn(`${state.getState()} state, waiting for ${ApplicationStates.READY} state, event ${event}`);
            return new MessageInitialization()
        }

        return await handleFunc(msg);
    })
}
