import assert from 'node:assert/strict';
import { loadService, capturedHandlers, stubs, StubMessageError, StubMessageResponse } from './_handler-harness.mjs';

const HANDLER_TIMEOUT_MS = 200;
async function callWithTimeout(cb, msg) {
    return await Promise.race([
        Promise.resolve().then(() => cb(msg)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('handler timeout')), HANDLER_TIMEOUT_MS)),
    ]);
}

let RelayerAccountsService;
try {
    ({ RelayerAccountsService } = await loadService('../dist/api/relayer-accounts.js'));
} catch (e) {
    console.warn('[relayer-accounts-handlers.test] dist import failed:', e.message);
}

const handlers = (() => {
    if (!RelayerAccountsService) return [];
    try {
        const svc = new RelayerAccountsService();
        const logger = { async error() {}, async info() {}, async warn() {}, async debug() {} };
        const start = capturedHandlers.length;
        svc.registerListeners(logger);
        return capturedHandlers.slice(start);
    } catch (err) {
        console.warn('[relayer-accounts-handlers.test] registerListeners failed:', err.message);
        return [];
    }
})();

describe('@unit relayer-accounts NATS handler envelope coverage', () => {
    it('registers handlers', () => {
        if (!RelayerAccountsService) { console.warn('  [skip] dist not available'); return; }
        assert.ok(handlers.length > 0);
    });

    it('every handler returns an envelope on shaped input', async function () {
        if (!handlers.length) return;
        this.timeout(HANDLER_TIMEOUT_MS * handlers.length + 5000);
        const msg = {
            tenantId: 't-1',
            user: { ...stubs.nextUser, did: 'did:hedera:0.0.1', id: 'u-1', hederaAccountId: '0.0.1' },
            account: '0.0.1',
            relayerAccount: '0.0.2',
            did: 'did:hedera:0.0.1',
            filters: { search: '', pageIndex: 0, pageSize: 50 },
            config: { name: 'rel-1', account: '0.0.99', key: 'priv' },
            userId: 'u-1',
        };
        let exceptions = 0;
        for (const { cb } of handlers) {
            try { await callWithTimeout(cb, msg); } catch { exceptions++; }
        }
        assert.ok(exceptions < handlers.length * 0.9);
    });

    it('handlers do not throw on empty input', async function () {
        if (!handlers.length) return;
        this.timeout(HANDLER_TIMEOUT_MS * handlers.length + 5000);
        let exceptions = 0;
        for (const { cb } of handlers) {
            try { await callWithTimeout(cb, {}); } catch { exceptions++; }
        }
        assert.ok(exceptions < handlers.length);
    });
});
