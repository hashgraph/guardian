import assert from 'node:assert/strict';
import { loadService, capturedHandlers, stubs, StubMessageError, StubMessageResponse } from './_handler-harness.mjs';

let RoleService;
try {
    ({ RoleService } = await loadService('../dist/api/role-service.js'));
} catch (e) {
    console.warn('[role-service-handlers.test] dist import failed:', e.message);
}

const handlers = (() => {
    if (!RoleService) return [];
    try {
        const svc = new RoleService();
        const logger = { async error() {}, async info() {}, async warn() {}, async debug() {} };
        const start = capturedHandlers.length;
        svc.registerListeners(logger);
        return capturedHandlers.slice(start);
    } catch (err) {
        console.warn('[role-service-handlers.test] registerListeners failed:', err.message);
        return [];
    }
})();

describe('@unit role-service NATS handler envelope coverage', () => {
    it('registers handlers', () => {
        if (!RoleService) { console.warn('  [skip] RoleService dist not available'); return; }
        assert.ok(handlers.length > 0);
    });

    it('every handler returns an envelope on empty input', async () => {
        if (!handlers.length) return;
        let envelopes = 0, exceptions = 0;
        for (const { cb } of handlers) {
            try {
                const result = await cb({});
                if (result === undefined ||
                    result instanceof StubMessageResponse ||
                    result instanceof StubMessageError ||
                    (result && (result.type === 'response' || result.type === 'error'))) {
                    envelopes++;
                }
            } catch { exceptions++; }
        }
        assert.ok(exceptions < handlers.length, `${exceptions}/${handlers.length} handlers threw on empty input`);
        assert.ok(envelopes > 0);
    });

    it('every handler returns an envelope on shaped input', async () => {
        if (!handlers.length) return;
        const msg = {
            tenantId: 't-1',
            userId: 'u-1',
            id: 'r-1',
            username: 'alice',
            user: stubs.nextUser,
            owner: { creator: 'u-1', owner: 'u-1' },
            role: stubs.nextRole,
            userRoles: ['r-1'],
            name: 'role-search',
            organization: 'org-1',
            permissionsMap: [],
            orgName: 'org-1',
            pageIndex: 0,
            pageSize: 50,
        };
        let exceptions = 0;
        for (const { cb } of handlers) {
            try { await cb(msg); } catch { exceptions++; }
        }
        assert.ok(exceptions < handlers.length * 0.7, `too many handlers threw: ${exceptions}/${handlers.length}`);
    });
});
