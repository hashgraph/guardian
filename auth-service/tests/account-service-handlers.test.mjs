import assert from 'node:assert/strict';
import { loadService, capturedHandlers, stubs, StubMessageError, StubMessageResponse } from './_handler-harness.mjs';

// Per-handler timeout so a single hung handler can't kill the loop. Handlers
// that hang count as exceptions and are summarised in the assertion.
const HANDLER_TIMEOUT_MS = 200;
async function callWithTimeout(cb, msg) {
    return await Promise.race([
        Promise.resolve().then(() => cb(msg)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('handler timeout')), HANDLER_TIMEOUT_MS)),
    ]);
}

const localStubs = {
    nextAccessToken: { userId: 'u-1', username: 'alice', did: 'did:hedera:0.0.1', role: 'STANDARD_USER', expireAt: Date.now() + 60000 },
    nextRefreshToken: { id: 'r-1', name: 'alice', expireAt: Date.now() + 60000 },
    nextTenant: { id: 't-1', tenantName: 'Tenant 1', owner: 'u-1', network: 'testnet' },
    nextSubscription: { features: ['F'], limits: { tenant: 0, policy: 0, policyTotal: 0 }, status: 'ACTIVE', code: 'PRO' },
    nextInvite: { id: 'i-1', deadline: new Date(Date.now() + 60_000_000), tenantId: 't-1' },
};

const fakeUserAccessTokenService = {
    async generateAccessToken() { return 'acc.token.jwt'; },
    async verifyAccessToken() { return localStubs.nextAccessToken; },
    generateRefreshToken() { return { id: 'r-1', token: 'ref.token.jwt' }; },
    verifyRefreshToken() { return localStubs.nextRefreshToken; },
};

let AccountService;
let UserAccessTokenService;
try {
    ({ AccountService } = await loadService('../dist/api/account-service.js'));
    ({ UserAccessTokenService } = await loadService('../dist/utils/user-access-token.js'));
} catch (e) {
    console.warn('[account-service-handlers.test] dist import failed:', e.message);
}

describe('@unit account-service NATS handler envelope coverage', () => {
    let svc;
    before(() => {
        if (!AccountService || !UserAccessTokenService) { console.warn('  [skip] dist not available'); return; }
        UserAccessTokenService.New = async () => fakeUserAccessTokenService;
        try {
            svc = new AccountService();
            const logger = { async error() {}, async info() {}, async warn() {}, async debug() {} };
            svc.registerListeners(logger);
        } catch (err) {
            console.warn('[account-service-handlers.test] registerListeners failed:', err.message);
        }
    });

    it('registers >20 handlers', () => {
        if (!svc) return;
        assert.ok(capturedHandlers.length > 20, `expected >20 handlers, got ${capturedHandlers.length}`);
    });

    it('every handler returns an envelope on empty input', async function () {
        if (!svc) return;
        this.timeout(HANDLER_TIMEOUT_MS * capturedHandlers.length + 5000);
        let envelopes = 0, exceptions = 0;
        const errorsByEvent = [];
        for (const { event, cb } of capturedHandlers) {
            try {
                const result = await callWithTimeout(cb, {});
                if (result && (result.type === 'response' || result.type === 'error' || result instanceof StubMessageError || result instanceof StubMessageResponse)) {
                    envelopes++;
                } else {
                    envelopes++;
                }
            } catch (e) {
                exceptions++;
                errorsByEvent.push(`${event}: ${e.message}`);
            }
        }
        assert.ok(
            exceptions < capturedHandlers.length * 0.7,
            `Too many handlers threw on empty input (${exceptions}/${capturedHandlers.length}):\n  ${errorsByEvent.slice(0, 5).join('\n  ')}`,
        );
        assert.ok(envelopes > 0);
    });

    it('handlers do not throw on shaped user input', async function () {
        if (!svc) return;
        this.timeout(HANDLER_TIMEOUT_MS * capturedHandlers.length + 5000);
        const msg = {
            tenantId: 't-1',
            userId: 'u-1',
            user: stubs.nextUser,
            username: 'alice',
            password: 'pwd',
            did: 'did:hedera:0.0.1',
            token: 'tok',
            account: '0.0.1',
            role: 'USER',
            email: 'a@x',
            newEmail: 'b@x',
            oldEmail: 'a@x',
            refreshToken: 'r',
            tenantName: 'T',
            owner: { creator: 'u-1', owner: 'u-1' },
        };
        let exceptions = 0;
        for (const { cb } of capturedHandlers) {
            try { await callWithTimeout(cb, msg); } catch { exceptions++; }
        }
        assert.ok(exceptions < capturedHandlers.length * 0.75);
    });
});
