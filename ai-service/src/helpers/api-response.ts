import { AISuggestionService } from './suggestions.js';
import { MessageResponse } from '@guardian/common';

/**
 * API response
 * @param event
 * @param handleFunc
 * @constructor
 */
export function ApiResponse<T>(event: any, handleFunc: (msg) => Promise<MessageResponse<T>>): void {
    new AISuggestionService().registerListener(event, async (msg) => {
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
    new AISuggestionService().subscribe(event, async (msg) => {
        await handleFunc(msg);
    })
}
