import assert from 'node:assert/strict';
import sinon from 'sinon';
import { NatsService } from '../../dist/mq/nats-service.js';
import { JwtServicesValidator } from '../../dist/security/index.js';

/**
 * A failure while decoding a reply (e.g. a large-payload directLink fetch
 * throwing ECONNREFUSED when the responder died mid-request) must fail only
 * that request instead of throwing out of the async subscribe callback and
 * crashing the process.
 */
class TestNats extends NatsService {
    messageQueueName = 'test-queue';
    replySubject = 'test-reply';
}

async function buildService(decodeImpl) {
    const svc = new TestNats();
    let replyCallback;
    // connection/codec are TS-protected; accessible at runtime in JS tests.
    svc.connection = {
        subscribe: (_subject, opts) => {
            replyCallback = opts.callback;
            return {};
        }
    };
    svc.codec = { decode: decodeImpl, encode: async (d) => d };
    await svc.init();
    return { svc, getReplyCallback: () => replyCallback };
}

function makeMsg(messageId, subject) {
    return {
        subject,
        data: new Uint8Array(),
        headers: { get: (key) => (key === 'messageId' ? messageId : 'token') }
    };
}

describe('NatsService reply handler decode failure', () => {
    afterEach(() => sinon.restore());

    it('routes a decode failure to the caller as code 500 without throwing out of the callback', async () => {
        const { svc, getReplyCallback } = await buildService(
            async () => { throw new Error('connect ECONNREFUSED 10.0.0.1:55427'); }
        );

        let result;
        svc.responseCallbacksMap.set('mid-1', (body, error, code) => {
            result = { body, error, code };
        });

        // Must resolve (not reject) — that is the whole point of the fix.
        await getReplyCallback()(null, makeMsg('mid-1', 'test-reply'));

        // The caller receives a generic message; internal detail stays server-side.
        assert.deepEqual(result, {
            body: null,
            error: 'Failed to decode reply payload',
            code: 500
        });
        assert.equal(svc.responseCallbacksMap.has('mid-1'), false, 'callback must be cleaned up');
    });

    it('still delivers a successful reply body to the waiting caller', async () => {
        sinon.stub(JwtServicesValidator, 'verify').resolves();
        const { svc, getReplyCallback } = await buildService(
            async () => ({ body: { ok: true }, error: undefined, code: 200 })
        );

        let result;
        svc.responseCallbacksMap.set('mid-2', (body, error, code) => {
            result = { body, error, code };
        });

        await getReplyCallback()(null, makeMsg('mid-2', 'test-reply'));

        assert.deepEqual(result, { body: { ok: true }, error: undefined, code: 200 });
        assert.equal(svc.responseCallbacksMap.has('mid-2'), false, 'callback must be cleaned up');
    });

    it('ignores replies with no registered callback (no throw)', async () => {
        const { svc, getReplyCallback } = await buildService(
            async () => { throw new Error('should not be called'); }
        );
        await getReplyCallback()(null, makeMsg('unknown-id', 'test-reply'));
        assert.equal(svc.responseCallbacksMap.size, 0);
    });
});

/**
 * sendMessage/sendRawMessage must not use an async Promise executor: a
 * sign/encode/publish failure there becomes an unhandledRejection and leaves the
 * caller's promise pending forever. The fix must reject the promise and clean up
 * the pending response callback instead.
 */
describe('NatsService send failure handling', () => {
    afterEach(() => sinon.restore());

    it('sendMessage rejects (and clears its callback) when encode fails, instead of hanging', async () => {
        sinon.stub(JwtServicesValidator, 'sign').resolves('token');
        const { svc } = await buildService(async () => ({}));
        svc.connection.publish = () => { };
        svc.codec.encode = async () => { throw new Error('encode boom'); };

        await assert.rejects(svc.sendMessage('subject', { x: 1 }), /encode boom/);
        assert.equal(svc.responseCallbacksMap.size, 0, 'pending callback must be cleaned up');
    });

    it('sendRawMessage rejects (and clears its callback) when sign fails, instead of hanging', async () => {
        sinon.stub(JwtServicesValidator, 'sign').rejects(new Error('sign boom'));
        const { svc } = await buildService(async () => ({}));
        svc.connection.publish = () => { };
        svc.codec.encode = async (d) => d;

        await assert.rejects(svc.sendRawMessage('subject', { x: 1 }), /sign boom/);
        assert.equal(svc.responseCallbacksMap.size, 0, 'pending callback must be cleaned up');
    });
});
