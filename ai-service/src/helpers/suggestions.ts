import { NatsService } from './common/nats-service.js';
import { Singleton } from './decorators/singleton.js';
import { GenerateUUIDv4 } from './interfaces/generate-uuid-v4.js';

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
