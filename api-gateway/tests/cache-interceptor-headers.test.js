import 'reflect-metadata';
import assert from 'node:assert/strict';
import { firstValueFrom, of } from 'rxjs';

import { CacheInterceptor } from '../dist/helpers/interceptors/cache.js';

function makeStore(initial = {}) {
    const data = { ...initial };
    const sets = [];
    return {
        data,
        sets,
        service: {
            get: async (k) => (k in data ? data[k] : null),
            set: async (k, v) => { sets.push({ k, v }); data[k] = v; },
            addTags: async () => {},
        },
    };
}

function makeContext(request, response) {
    const handler = function handlerFn() {};
    return {
        switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
        getHandler: () => handler,
        getClass: () => function classFn() {},
    };
}

function fastify(ctx) {
    Reflect.defineMetadata('fastify', true, ctx.getHandler());
}

async function run(it, ctx, next) {
    return firstValueFrom(await it.intercept(ctx, next));
}

describe('CacheInterceptor header preservation (fastify)', () => {
    it('captures X-Total-Count on a miss', async () => {
        const store = makeStore();
        const req = { headers: {}, url: '/paged', locals: [{ a: 1 }] };
        const res = { getHeader: (k) => (k === 'X-Total-Count' ? 42 : undefined) };
        const ctx = makeContext(req, res);
        fastify(ctx);
        const it = new CacheInterceptor(store.service);
        await run(it, ctx, { handle: () => of(undefined) });
        const envelope = JSON.parse(store.sets[0].v);
        assert.deepEqual(envelope.data, [{ a: 1 }]);
        assert.deepEqual(envelope.headers, { 'X-Total-Count': '42' });
    });

    it('re-applies X-Total-Count via response.header on a hit', async () => {
        const store = makeStore();
        const applied = {};
        const sent = [];
        const req = { headers: {}, url: '/paged', locals: [{ a: 1 }] };
        const res = {
            getHeader: (k) => (k === 'X-Total-Count' ? 7 : undefined),
            header: (k, v) => { applied[k] = v; },
            send: (x) => { sent.push(x); return 'SENT'; },
        };
        const ctx = makeContext(req, res);
        fastify(ctx);
        const it = new CacheInterceptor(store.service);
        // miss populates the cache, second call is served from it
        await run(it, ctx, { handle: () => of(undefined) });
        delete res.getHeader;
        const result = await run(it, ctx, { handle: () => of('fresh') });
        assert.equal(applied['X-Total-Count'], '7');
        assert.deepEqual(sent, [[{ a: 1 }]]);
        assert.equal(result, 'SENT');
    });

    it('captures and replays download headers for a buffer body', async () => {
        const store = makeStore();
        const hdr = {
            'Content-Disposition': 'attachment; filename=template.xlsx',
            'Content-Type': 'application/zip',
        };
        const applied = {};
        const sent = [];
        const req = { headers: {}, url: '/dl', locals: Buffer.from('zipbytes') };
        const res = {
            getHeader: (k) => hdr[k],
            header: (k, v) => { applied[k] = v; },
            send: (x) => { sent.push(x); return 'SENT'; },
        };
        const ctx = makeContext(req, res);
        fastify(ctx);
        const it = new CacheInterceptor(store.service);
        await run(it, ctx, { handle: () => of(undefined) });
        const envelope = JSON.parse(store.sets[0].v);
        assert.equal(envelope.type, 'buffer');
        assert.deepEqual(envelope.headers, hdr);

        delete res.getHeader;
        await run(it, ctx, { handle: () => of('fresh') });
        assert.equal(applied['Content-Disposition'], hdr['Content-Disposition']);
        assert.equal(applied['Content-Type'], hdr['Content-Type']);
        assert.ok(Buffer.isBuffer(sent[0]));
        assert.equal(sent[0].toString(), 'zipbytes');
    });
});
