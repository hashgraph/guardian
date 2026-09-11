import { NatsService } from '@guardian/common';
import { GenerateUUIDv4, IPropertySuggestionRequest, IPropertySuggestionResponse, MessageAPI } from '@guardian/interfaces';
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

    public async getPropertySuggestions(request: IPropertySuggestionRequest): Promise<IPropertySuggestionResponse> {
        try {
            const res = await this.requestOrThrow<IPropertySuggestionResponse>(MessageAPI.SUGGESTIONS_GET_PROPERTIES, request, 45000);
            return res || { available: false, results: [] };
        } catch (error: any) {
            if (error?.code === 'NO_RESPONDERS' || error?.code === 'REQUEST_TIMEOUT') {
                return { available: false, results: [] };
            }
            throw error;
        }
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
