import { ApiResponse } from '../../helpers/api-response.js';
import { AIManager } from '../../ai-manager.js';
import { MessageAPI } from '@guardian/interfaces';
import { MessageError, MessageResponse } from '@guardian/common';

/**
 * Connect to the message broker methods of working with artifacts.
 */
export async function aiSuggestionsAPI(aiManager: AIManager): Promise<void> {
    /**
     * AI Suggestions
     *
     * @param {any} msg - Question
     *
     * @returns {ResponseData} - Response AI Data
     */
    ApiResponse(MessageAPI.SUGGESTIONS_GET_ANSWER, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid msg is missing');
            }

            let result = null;
            if (aiManager.vector !== null && aiManager.chain !== null) {
                result = await aiManager.ask(msg.question);
            } else {
                aiManager = new AIManager();
                await aiManager.rebuildVector();

                result = await aiManager.ask(msg.question);
            }

            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error.message);
        }
    });

    ApiResponse(MessageAPI.VECTOR_REBUILD, async () => {
        try {
            aiManager = new AIManager();
            await aiManager.rebuildVector();

            return new MessageResponse(true);
        } catch (error) {
            return new MessageError(error.message);
        }
    });
}
