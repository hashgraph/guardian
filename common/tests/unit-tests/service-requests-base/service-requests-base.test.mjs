import assert from 'node:assert/strict';
import { ServiceRequestsBase } from '../../../dist/helpers/service-requests-base.js';

class TestRequester extends ServiceRequestsBase {
    target = 'TEST_SERVICE';
}

class FakeChannel {
    constructor(impl) { this.impl = impl; this.calls = []; }
    async request(subject, params) {
        this.calls.push({ subject, params });
        return this.impl(subject, params);
    }
}

describe('@unit ServiceRequestsBase.request', () => {
    it('returns response.body on a successful response', async () => {
        const req = new TestRequester();
        req.setChannel(new FakeChannel(() => ({ body: { ok: true } })));
        const result = await req.request('echo', { x: 1 });
        assert.deepEqual(result, { ok: true });
    });

    it('uses "<target>.<entity>" as the channel subject', async () => {
        const req = new TestRequester();
        const ch = new FakeChannel(() => ({ body: 'ok' }));
        req.setChannel(ch);
        await req.request('myEntity');
        assert.equal(ch.calls[0].subject, 'TEST_SERVICE.myEntity');
    });

    it('forwards params to the channel verbatim', async () => {
        const req = new TestRequester();
        const ch = new FakeChannel(() => ({ body: null }));
        req.setChannel(ch);
        await req.request('e', { foo: 'bar', n: 42 });
        assert.deepEqual(ch.calls[0].params, { foo: 'bar', n: 42 });
    });

    it('throws "server is not available" wrapped when response is null', async () => {
        const req = new TestRequester();
        req.setChannel(new FakeChannel(() => null));
        await assert.rejects(() => req.request('ping'), /TEST_SERVICE server is not available/);
        await assert.rejects(() => req.request('ping'), /Guardian \(ping\) send:/);
    });

    it('throws when response is undefined', async () => {
        const req = new TestRequester();
        req.setChannel(new FakeChannel(() => undefined));
        await assert.rejects(() => req.request('ping'));
    });

    it('throws the inner error wrapped when response.error is set', async () => {
        const req = new TestRequester();
        req.setChannel(new FakeChannel(() => ({ error: 'something bad' })));
        await assert.rejects(() => req.request('ping'), /something bad/);
        await assert.rejects(() => req.request('ping'), /Guardian \(ping\) send:/);
    });

    it('re-wraps channel.request rejections', async () => {
        const req = new TestRequester();
        req.setChannel(new FakeChannel(() => { throw new Error('network-down'); }));
        await assert.rejects(() => req.request('ping'), /network-down/);
        await assert.rejects(() => req.request('ping'), /Guardian \(ping\) send:/);
    });

    it('returns null body verbatim', async () => {
        const req = new TestRequester();
        req.setChannel(new FakeChannel(() => ({ body: null })));
        const result = await req.request('e');
        assert.equal(result, null);
    });

    it('preserves falsy bodies (0, false, "")', async () => {
        const req = new TestRequester();
        req.setChannel(new FakeChannel(() => ({ body: 0 })));
        assert.equal(await req.request('e'), 0);
        req.setChannel(new FakeChannel(() => ({ body: false })));
        assert.equal(await req.request('e'), false);
        req.setChannel(new FakeChannel(() => ({ body: '' })));
        assert.equal(await req.request('e'), '');
    });

    it('setChannel / getChannel round-trip', () => {
        const req = new TestRequester();
        const ch = new FakeChannel(() => ({ body: null }));
        req.setChannel(ch);
        assert.strictEqual(req.getChannel(), ch);
    });

    it('different entities produce different subjects', async () => {
        const req = new TestRequester();
        const ch = new FakeChannel(() => ({ body: 'x' }));
        req.setChannel(ch);
        await req.request('a');
        await req.request('b');
        assert.deepEqual(ch.calls.map((c) => c.subject), ['TEST_SERVICE.a', 'TEST_SERVICE.b']);
    });
});
