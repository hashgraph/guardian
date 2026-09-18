import assert from 'node:assert/strict';
import { of, lastValueFrom } from 'rxjs';
import { PerformanceInterceptor } from '../../dist/helpers/interceptors/performance.js';

function buildContext(request) {
    return {
        switchToHttp: () => ({ getRequest: () => request }),
    };
}

describe('PerformanceInterceptor', () => {
    const interceptor = new PerformanceInterceptor();

    it('is constructible and exposes intercept', () => {
        assert.equal(typeof interceptor.intercept, 'function');
    });

    it('passes the downstream value through unchanged', async () => {
        const ctx = buildContext({ url: '/api/v1/policies' });
        const next = { handle: () => of({ ok: true }) };
        const result = await lastValueFrom(interceptor.intercept(ctx, next));
        assert.deepEqual(result, { ok: true });
    });

    it('returns an observable (has subscribe)', () => {
        const ctx = buildContext({ url: '/x' });
        const next = { handle: () => of(1) };
        const out = interceptor.intercept(ctx, next);
        assert.equal(typeof out.subscribe, 'function');
    });

    it('logs the request route on emission', async () => {
        const logged = [];
        const original = console.log;
        console.log = (msg) => logged.push(msg);
        try {
            const ctx = buildContext({ url: '/api/v1/tokens' });
            const next = { handle: () => of('done') };
            await lastValueFrom(interceptor.intercept(ctx, next));
        } finally {
            console.log = original;
        }
        assert.equal(logged.length, 1);
        assert.match(logged[0], /Execution time for \/api\/v1\/tokens: [\d.]+ms/);
    });

    it('tolerates a request without a url (undefined route)', async () => {
        const logged = [];
        const original = console.log;
        console.log = (msg) => logged.push(msg);
        try {
            const ctx = buildContext({});
            const next = { handle: () => of(null) };
            const result = await lastValueFrom(interceptor.intercept(ctx, next));
            assert.equal(result, null);
        } finally {
            console.log = original;
        }
        assert.match(logged[0], /Execution time for undefined:/);
    });

    it('does not log before the source emits', () => {
        const logged = [];
        const original = console.log;
        console.log = (msg) => logged.push(msg);
        try {
            const ctx = buildContext({ url: '/lazy' });
            const next = { handle: () => of(42) };
            interceptor.intercept(ctx, next);
        } finally {
            console.log = original;
        }
        assert.equal(logged.length, 0);
    });
});
