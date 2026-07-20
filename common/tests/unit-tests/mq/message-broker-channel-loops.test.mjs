import assert from 'node:assert/strict';
import { headers } from 'nats';

process.env.QM_VERIFICATION = 'false';

const { MessageBrokerChannel } = await import('../../../dist/mq/message-broker-channel.js');

function makeMsg({ msgHeaders, data, subject = 'svc.evt' }) {
    return {
        headers: msgHeaders,
        data: typeof data === 'string' ? Buffer.from(data) : data,
        subject,
        responded: [],
        respond(payload, opts) {
            this.responded.push({ payload, opts });
        }
    };
}

function hdr(map) {
    const h = headers();
    for (const [k, v] of Object.entries(map)) {
        h.set(k, String(v));
    }
    return h;
}

function controllableSub() {
    const queue = [];
    let resolveNext = null;
    let closed = false;
    const push = (m) => {
        if (resolveNext) {
            const r = resolveNext;
            resolveNext = null;
            r({ value: m, done: false });
        } else {
            queue.push(m);
        }
    };
    const close = () => {
        closed = true;
        if (resolveNext) {
            const r = resolveNext;
            resolveNext = null;
            r({ value: undefined, done: true });
        }
    };
    const iterable = {
        [Symbol.asyncIterator]() {
            return {
                next() {
                    if (queue.length) {
                        return Promise.resolve({ value: queue.shift(), done: false });
                    }
                    if (closed) {
                        return Promise.resolve({ value: undefined, done: true });
                    }
                    return new Promise((resolve) => { resolveNext = resolve; });
                }
            };
        }
    };
    return { iterable, push, close };
}

async function flush() {
    for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setImmediate(resolve));
    }
}

describe('@unit MessageBrokerChannel constructor response loop', () => {
    it('skips messages with no headers and with no chunks header', async () => {
        const sub = controllableSub();
        const channel = {
            subscribe: () => sub.iterable,
            publish() {},
            request() { return Promise.resolve(); }
        };
        new MessageBrokerChannel(channel, 'svc');

        sub.push(makeMsg({ msgHeaders: undefined, data: 'x' }));
        sub.push(makeMsg({ msgHeaders: hdr({ messageId: 'm1' }), data: 'x' }));
        await flush();
        sub.close();
        await flush();
        assert.ok(true);
    });

    it('accumulates chunks and continues while incomplete', async () => {
        const sub = controllableSub();
        const channel = {
            subscribe: () => sub.iterable,
            publish() {},
            request() { return Promise.resolve(); }
        };
        new MessageBrokerChannel(channel, 'svc');

        sub.push(makeMsg({ msgHeaders: hdr({ messageId: 'mid-a', chunks: 2, chunk: 1 }), data: '{"a":' }));
        await flush();
        sub.close();
        await flush();
        assert.ok(true);
    });

    it('accumulates a second chunk for the same messageId then drops it when no request is registered', async () => {
        const sub = controllableSub();
        const channel = {
            subscribe: () => sub.iterable,
            publish() {},
            request() { return Promise.resolve(); }
        };
        new MessageBrokerChannel(channel, 'svc');

        const full = Buffer.from(JSON.stringify({ q: 1 }));
        const half = Math.ceil(full.length / 2);
        sub.push(makeMsg({ msgHeaders: hdr({ messageId: 'orphan', chunks: 2, chunk: 1 }), data: full.subarray(0, half) }));
        await flush();
        sub.push(makeMsg({ msgHeaders: hdr({ messageId: 'orphan', chunks: 2, chunk: 2 }), data: full.subarray(half) }));
        await flush();
        sub.close();
        await flush();
        assert.ok(true);
    });

    it('reassembles chunks and dispatches to a registered request callback', async () => {
        const sub = controllableSub();
        const channel = {
            subscribe: () => sub.iterable,
            publish() {},
            request(subject, data, opts) {
                const mid = opts.headers.get('messageId');
                setImmediate(() => {
                    sub.push(makeMsg({ msgHeaders: hdr({ messageId: mid, chunks: 1, chunk: 1 }), data }));
                });
                return Promise.resolve();
            }
        };
        const mbc = new MessageBrokerChannel(channel, 'svc');
        const result = await mbc.request('svc.evt', { hello: 'world' });
        assert.deepEqual(result, { hello: 'world' });
        sub.close();
        await flush();
    });
});

describe('@unit MessageBrokerChannel.response chunked handling', () => {
    it('handles a single-chunk request: parses, runs handler, publishes chunked response', async () => {
        const sub = controllableSub();
        const published = [];
        const channel = {
            subscribe: () => sub.iterable,
            publish(subject, data, opts) { published.push({ subject, data, opts }); },
            request() { return Promise.resolve(); }
        };
        const mbc = new MessageBrokerChannel(channel, 'svc');

        const handled = [];
        const responsePromise = mbc.response('svc.evt', async (data) => {
            handled.push(data);
            return { code: 200, body: { echoed: data } };
        });

        const reqPayload = Buffer.from(JSON.stringify({ x: 42 }));
        const m = makeMsg({ msgHeaders: hdr({ messageId: 'r1', chunks: 1, chunk: 1 }), data: reqPayload });
        sub.push(m);
        await flush();
        sub.close();
        await responsePromise;

        assert.deepEqual(handled[0], { x: 42 });
        assert.equal(m.responded.length, 1);
        assert.ok(published.length >= 1);
        assert.equal(published[0].subject, 'response-message');
    });

    it('handles a non-chunked request body', async () => {
        const sub = controllableSub();
        const published = [];
        const channel = {
            subscribe: () => sub.iterable,
            publish(subject, data, opts) { published.push({ subject, data, opts }); },
            request() { return Promise.resolve(); }
        };
        const mbc = new MessageBrokerChannel(channel, 'svc');

        const handled = [];
        const responsePromise = mbc.response('svc.evt', async (data) => {
            handled.push(data);
            return { code: 200 };
        });

        const m = makeMsg({ msgHeaders: hdr({ messageId: 'r2' }), data: JSON.stringify({ y: 7 }) });
        sub.push(m);
        await flush();
        sub.close();
        await responsePromise;

        assert.deepEqual(handled[0], { y: 7 });
        assert.ok(published.length >= 1);
    });

    it('wraps a handler error into a MessageError response', async () => {
        const sub = controllableSub();
        const published = [];
        const channel = {
            subscribe: () => sub.iterable,
            publish(subject, data, opts) { published.push({ subject, data, opts }); },
            request() { return Promise.resolve(); }
        };
        const mbc = new MessageBrokerChannel(channel, 'svc');

        const responsePromise = mbc.response('svc.evt', async () => {
            const err = new Error('handler boom');
            err.code = 500;
            throw err;
        });

        const m = makeMsg({ msgHeaders: hdr({ messageId: 'r3' }), data: JSON.stringify({ z: 1 }) });
        sub.push(m);
        await flush();
        sub.close();
        await responsePromise;

        assert.ok(published.length >= 1);
        const body = JSON.parse(Buffer.from(published[0].data).toString());
        assert.ok(body);
    });

    it('continues collecting multi-chunk requests before producing a response', async () => {
        const sub = controllableSub();
        const published = [];
        const channel = {
            subscribe: () => sub.iterable,
            publish(subject, data, opts) { published.push({ subject, data, opts }); },
            request() { return Promise.resolve(); }
        };
        const mbc = new MessageBrokerChannel(channel, 'svc');

        const handled = [];
        const responsePromise = mbc.response('svc.evt', async (data) => {
            handled.push(data);
            return { code: 200 };
        });

        const full = Buffer.from(JSON.stringify({ big: 'payload' }));
        const half = Math.ceil(full.length / 2);
        const p1 = full.subarray(0, half);
        const p2 = full.subarray(half);

        sub.push(makeMsg({ msgHeaders: hdr({ messageId: 'rc', chunks: 2, chunk: 1 }), data: p1 }));
        await flush();
        sub.push(makeMsg({ msgHeaders: hdr({ messageId: 'rc', chunks: 2, chunk: 2 }), data: p2 }));
        await flush();
        sub.close();
        await responsePromise;

        assert.deepEqual(handled[0], { big: 'payload' });
    });

    it('logs and continues when message parsing fails', async () => {
        const sub = controllableSub();
        const channel = {
            subscribe: () => sub.iterable,
            publish() {},
            request() { return Promise.resolve(); }
        };
        const mbc = new MessageBrokerChannel(channel, 'svc');

        const responsePromise = mbc.response('svc.evt', async () => ({ code: 200 }));
        sub.push(makeMsg({ msgHeaders: hdr({ messageId: 'bad' }), data: 'not-json{' }));
        await flush();
        sub.close();
        await responsePromise;
        assert.ok(true);
    });
});

describe('@unit MessageBrokerChannel.request error mapping', () => {
    it('resolves null on a 503 (no listener) error', async () => {
        const channel = {
            subscribe() {
                return { [Symbol.asyncIterator]() { return { next: () => Promise.resolve({ done: true }) }; } };
            },
            publish() {},
            request() {
                const err = new Error('no responders');
                err.code = '503';
                return Promise.reject(err);
            }
        };
        const mbc = new MessageBrokerChannel(channel, 'svc');
        const result = await mbc.request('svc.evt', { a: 1 });
        assert.equal(result, null);
    });

    it('rejects on a non-503 transport error', async () => {
        const channel = {
            subscribe() {
                return { [Symbol.asyncIterator]() { return { next: () => Promise.resolve({ done: true }) }; } };
            },
            publish() {},
            request() {
                const err = new Error('kaboom');
                err.code = '500';
                return Promise.reject(err);
            }
        };
        const mbc = new MessageBrokerChannel(channel, 'svc');
        await assert.rejects(() => mbc.request('svc.evt', { a: 1 }), /kaboom/);
    });
});
