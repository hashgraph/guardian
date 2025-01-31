import { NatsService } from '@guardian/common';
import { GenerateUUIDv4, MessageAPI } from '@guardian/interfaces';
import { Singleton } from './decorators/singleton.js';

/**
 * AI Suggestions service
 */
@Singleton
export class AISuggestions extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'ai-suggestions';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'ai-service-' + GenerateUUIDv4();

    /**
     * Get AI answer
     * @returns AI answer
     */
    public async getAIAnswer(question: string): Promise<any> {
        const res = (await this.sendMessage(MessageAPI.SUGGESTIONS_GET_ANSWER, {question})) as any;

        if (!res) {
            throw new Error('Invalid AI response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res;
    }

    public async rebuildAIVector(): Promise<any> {
        const res = (await this.sendMessage(MessageAPI.VECTOR_REBUILD, {})) as any;

        if (!res) {
            throw new Error('Invalid vector rebuild response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res;
    }
}
