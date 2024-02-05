import { NatsService, Singleton } from '@guardian/common';
import { GenerateUUIDv4, MessageAPI } from '@guardian/interfaces';

/**
 * AI Suggestions service
 */
@Singleton
export class AISuggestionsService extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'ai-suggestions-guardian';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'ai-service-' + GenerateUUIDv4();

    public async rebuildAIVector(): Promise<any> {
        console.log('rebuildAIVector');
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
