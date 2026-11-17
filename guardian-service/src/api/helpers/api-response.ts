import { ApplicationState } from '@guardian/common/helpers/application-state';
import { MessageInitialization, MessageResponse } from '@guardian/common/models/message-response';
import { ApplicationStates } from '@guardian/interfaces';
import { GuardiansService } from '../../helpers/guardians.js';

/**
 * API response
 * @param event
 * @param handleFunc
 * @constructor
 */
export function ApiResponse<T>(event: any, handleFunc: (msg) => Promise<MessageResponse<T>>): void {
    const state = new ApplicationState();
    new GuardiansService().registerListener(event, async (msg) => {
        if (![ApplicationStates.READY, ApplicationStates.BAD_CONFIGURATION].includes(state.getState())) {
            console.warn(`${state.getState()} state, waiting for ${ApplicationStates.READY} state, event ${event}`);
            return new MessageInitialization()
        }

        return await handleFunc(msg);
    })
}

/**
 * API response
 * @param channel
 * @param event
 * @param handleFunc
 * @constructor
 */
export function ApiResponseSubscribe<T>(event: any, handleFunc: (msg) => Promise<void>): void {
    new GuardiansService().subscribe(event, async (msg) => {
        await handleFunc(msg);
    })
}
