import esmock from 'esmock';

export function makeUser(over = {}) {
    return {
        id: 'user-1',
        did: 'did:hedera:user',
        username: 'alice',
        tenantId: 't1',
        tenantContext: { tenantId: 't1' },
        permissions: [],
        ...over
    };
}

export function makeRes() {
    const headers = {};
    let sent;
    const res = {
        headers,
        sent,
        header(name, value) { headers[name] = value; return res; },
        code(c) { res._code = c; return res; },
        send(payload) { res._sent = payload; return { __sent: true, payload }; }
    };
    return res;
}

export function makeReq(over = {}) {
    return { url: '/api/v1/x', params: {}, body: {}, ...over };
}

export function makeCacheService() {
    const calls = { invalidate: [], invalidateAllTagsByPrefixes: [] };
    return {
        calls,
        async invalidate(key) { calls.invalidate.push(key); },
        async invalidateAllTagsByPrefixes(p) { calls.invalidateAllTagsByPrefixes.push(p); }
    };
}

export function makeLogger() {
    const errors = [];
    return { errors, error(...a) { errors.push(a); } };
}

export class FakeEntityOwner {
    constructor(user) {
        this.user = user;
        this.owner = user?.did || 'owner-did';
        this.creator = user?.did || 'owner-did';
    }
}

export async function internalExceptionRethrow(error) {
    if (error && typeof error.getStatus === 'function') {
        throw error;
    }
    if (typeof error === 'string') {
        const e = new Error(error);
        e.getStatus = () => 500;
        throw e;
    }
    const e = new Error(error?.message || 'error');
    e.getStatus = () => (error?.code || 500);
    throw e;
}

export const guardiansInterfaces = {
    Permissions: new Proxy({}, { get: (_t, p) => String(p) }),
    PolicyStatus: { PUBLISH: 'PUBLISH', VIEW: 'VIEW', DRAFT: 'DRAFT' },
    TaskAction: new Proxy({}, { get: (_t, p) => String(p) }),
    UserPermissions: {
        has: (user, perms) => {
            const list = Array.isArray(perms) ? perms : [perms];
            const have = user?.permissions || [];
            return list.some((p) => have.includes(p));
        }
    },
    SchemaCategory: { MODULE: 'MODULE', POLICY: 'POLICY', TOOL: 'TOOL' },
    SchemaHelper: { updateOwner: () => undefined }
};

export async function loadController(distPath, overrides = {}) {
    return await esmock(distPath, overrides);
}
