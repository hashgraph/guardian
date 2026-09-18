import assert from 'node:assert/strict';
import { AISuggestionService } from '../dist/helpers/suggestions.js';

describe('AISuggestionService', () => {
    it('uses the ai-suggestions message queue and an ai-service reply subject', () => {
        const svc = new AISuggestionService();
        assert.equal(svc.messageQueueName, 'ai-suggestions');
        assert.match(svc.replySubject, /^ai-service-/);
    });

    it('registerListener subscribes to the event via getMessages', () => {
        const svc = new AISuggestionService();
        const subscribed = [];
        svc.setConnection({
            subscribe: (subject, opts) => {
                subscribed.push({ subject, opts });
                return { unsubscribe() {} };
            },
        });
        const cb = async () => 'ok';
        svc.registerListener('MY_EVENT', cb);
        assert.equal(subscribed.length, 1);
        assert.equal(subscribed[0].subject, 'MY_EVENT');
        assert.equal(subscribed[0].opts.queue, 'ai-suggestions');
    });

    it('is a singleton (same instance on repeated construction)', () => {
        assert.equal(new AISuggestionService(), new AISuggestionService());
    });
});
