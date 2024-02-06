import { NatsService } from './common/nats-service';
import { Singleton } from './decorators/singleton';
import { GenerateUUIDv4 } from './interfaces/generate-uuid-v4';

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
