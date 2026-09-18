import assert from 'node:assert/strict';
import sinon from 'sinon';
import { NatsService } from '../../dist/mq/nats-service.js';
import { JwtServicesValidator } from '../../dist/security/index.js';

// requestOrThrow: core request that fast-fails on "no responders" and maps
// transport outcomes to NO_RESPONDERS / REQUEST_TIMEOUT / MessageError / body.
class TestNats extends NatsService {
    messageQueueName = 'test-queue';
    replySubject = 'test-reply';
}

// Identity codec so connection.request's object flows straight through decode().
function buildService(requestImpl) {
    const svc = new TestNats();
    svc.connection = { request: requestImpl };
    svc.codec = { encode: async (d) => d, decode: async (d) => d };
    return svc;
}

const natsError = (code, message) => Object.assign(new Error(message ?? code), { code });

describe('NatsService.requestOrThrow fast-fail', () => {
    beforeEach(() => {
        sinon.stub(JwtServicesValidator, 'sign').resolves('token');
        // The reply is now verified before its body is trusted; default to valid.
        sinon.stub(JwtServicesValidator, 'verify').resolves();
    });
    afterEach(() => sinon.restore());

    it('returns the response body on success', async () => {
        const svc = buildService(async () => ({ data: { body: { ok: true }, error: undefined, code: 200 } }));
        const result = await svc.requestOrThrow('p1-CHECK_IF_ALIVE', {}, 1000, { policyId: 'p1' });
        assert.deepEqual(result, { ok: true });
    });

    it('publishes to the given subject with the extra filter headers', async () => {
        const request = sinon.stub().resolves({ data: { body: true } });
        const svc = buildService(request);
        await svc.requestOrThrow('p1-CHECK_IF_ALIVE', { a: 1 }, 1000, { policyId: 'p1' });

        const [subject, , opts] = request.firstCall.args;
        assert.equal(subject, 'p1-CHECK_IF_ALIVE');
        assert.equal(opts.timeout, 1000);
        assert.equal(opts.headers.get('policyId'), 'p1');
        assert.equal(opts.headers.get('serviceToken'), 'token');
    });

    it('throws NO_RESPONDERS immediately when the subject has no subscriber (code 503)', async () => {
        const request = sinon.stub().rejects(natsError('503'));
        const svc = buildService(request);
        await assert.rejects(
            svc.requestOrThrow('missing-EVENT', {}, 60000),
            (e) => e.code === 'NO_RESPONDERS'
        );
        assert.equal(request.callCount, 1, 'must not retry inside the primitive');
    });

    it('detects no-responders by message when the error carries no code', async () => {
        const svc = buildService(async () => { throw new Error('503 no responders available'); });
        await assert.rejects(svc.requestOrThrow('s', {}, 10), (e) => e.code === 'NO_RESPONDERS');
    });

    it('throws REQUEST_TIMEOUT when a responder exists but is too slow (code TIMEOUT)', async () => {
        const svc = buildService(async () => { throw natsError('TIMEOUT'); });
        await assert.rejects(svc.requestOrThrow('s', {}, 10), (e) => e.code === 'REQUEST_TIMEOUT');
    });

    it('throws a MessageError with the responder code when the responder returns an error', async () => {
        const svc = buildService(async () => ({ data: { body: null, error: 'Block Unavailable', code: 503 } }));
        await assert.rejects(
            svc.requestOrThrow('p1-SET_BLOCK_DATA', {}, 1000),
            (e) => e.message === 'Block Unavailable' && e.code === 503
        );
    });

    it('rethrows unexpected transport errors unchanged', async () => {
        const svc = buildService(async () => { throw new Error('connection closed'); });
        await assert.rejects(svc.requestOrThrow('s', {}, 10), /connection closed/);
    });

    it('verifies the reply serviceToken and rejects (401) when it is invalid', async () => {
        JwtServicesValidator.verify.rejects(new Error('bad token'));
        const svc = buildService(async () => ({
            data: { body: { ok: true } },
            headers: { get: () => 'forged' },
        }));
        await assert.rejects(
            svc.requestOrThrow('p1-CHECK_IF_ALIVE', {}, 1000),
            (e) => e.message === 'bad token' && e.code === 401
        );
    });

    it('fails a corrupt reply with a generic message (500) without leaking decode internals', async () => {
        const svc = buildService(async () => ({ data: 'corrupt' }));
        svc.codec.decode = async () => { throw new Error('ECONNREFUSED https://ipfs/directLink/secret'); };
        await assert.rejects(
            svc.requestOrThrow('s', {}, 10),
            (e) => e.message === 'Failed to decode reply payload' && e.code === 500
        );
    });
});
