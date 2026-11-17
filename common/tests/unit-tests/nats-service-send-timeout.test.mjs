import assert from 'node:assert/strict';
import sinon from 'sinon';
import { NatsService } from '../../dist/mq/nats-service.js';

class TestNats extends NatsService {
    messageQueueName = 'test-queue';
    replySubject = 'test-reply';
}

describe('NatsService.sendMessageWithTimeout', () => {
    let clock;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
    });
    afterEach(() => {
        sinon.restore();
    });

    it('rejects with REQUEST_TIMEOUT when no reply arrives in time', async () => {
        const svc = new TestNats();
        sinon.stub(svc, 'sendMessage').returns(new Promise(() => undefined));

        const pending = svc.sendMessageWithTimeout('auth-GET_USER_BY_TOKEN', 1000, {});
        const outcome = assert.rejects(pending, (error) => error.code === 'REQUEST_TIMEOUT');
        await clock.tickAsync(1000);
        await outcome;
    });

    it('drops the pending reply callback when it times out', async () => {
        const svc = new TestNats();
        sinon.stub(svc, 'sendMessage').callsFake((subject, data, isResponseCallback, messageId) => {
            svc.responseCallbacksMap.set(messageId, () => undefined);
            return new Promise(() => undefined);
        });

        const pending = svc.sendMessageWithTimeout('auth-GET_USER_BY_TOKEN', 1000, {});
        const outcome = assert.rejects(pending);
        assert.equal(svc.responseCallbacksMap.size, 1);
        await clock.tickAsync(1000);
        await outcome;
        assert.equal(svc.responseCallbacksMap.size, 0);
    });

    it('resolves with the reply and leaves no timer pending', async () => {
        const svc = new TestNats();
        sinon.stub(svc, 'sendMessage').resolves({ ok: true });

        const result = await svc.sendMessageWithTimeout('auth-GET_USER_BY_TOKEN', 1000, {});

        assert.deepEqual(result, { ok: true });
        assert.equal(clock.countTimers(), 0);
    });

    it('propagates a rejected reply and leaves no timer pending', async () => {
        const svc = new TestNats();
        sinon.stub(svc, 'sendMessage').rejects(new Error('boom'));

        await assert.rejects(svc.sendMessageWithTimeout('auth-GET_USER_BY_TOKEN', 1000, {}), /boom/);
        assert.equal(clock.countTimers(), 0);
    });
});
