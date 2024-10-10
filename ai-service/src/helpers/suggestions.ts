import { NatsService, Singleton } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';

/**
 * AISuggestionService service
 */
@Singleton
export class AISuggestionService extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'ai-suggestions';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'ai-service-' + GenerateUUIDv4();

    registerListener(event: string, cb: Function): void {
        this.getMessages(event, cb);
    }
}
