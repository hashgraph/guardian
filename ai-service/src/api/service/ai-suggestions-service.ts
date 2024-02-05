import { MessageError, MessageResponse } from '../../models/common/message-response';
import { ApiResponse } from '../../helpers/api-response';
import { MessageAPI } from '../../models/interfaces/message-api.type';
import { AIManager } from '../../ai-manager';

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
            if (aiManager.vector != null && aiManager.chain != null) {
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
