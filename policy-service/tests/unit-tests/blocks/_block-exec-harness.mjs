import { LocationType, PolicyStatus, PolicyAvailability } from '@guardian/interfaces';
import { DatabaseServer } from '@guardian/common';

const _origStatics = {};
let _staticsInstalled = false;

/** Neutralize the static DatabaseServer calls getOptions()/blocks make against the real ORM. */
export function installDbStatics(overrides = {}) {
    if (_staticsInstalled) return;
    const names = ['getPolicyById', 'getPolicyParameters', 'getPolicyCacheData', 'getVirtualUser', 'getResidue'];
    for (const n of names) {
        if (typeof DatabaseServer[n] === 'function') _origStatics[n] = DatabaseServer[n];
    }
    DatabaseServer.getPolicyById = overrides.getPolicyById || (async () => ({ editableParametersSettings: null }));
    DatabaseServer.getPolicyParameters = overrides.getPolicyParameters || (async () => null);
    _staticsInstalled = true;
}

export function restoreHarness() {
    for (const [n, fn] of Object.entries(_origStatics)) DatabaseServer[n] = fn;
    for (const k of Object.keys(_origStatics)) delete _origStatics[k];
    _staticsInstalled = false;
}

export function makeUser(overrides = {}) {
    return {
        id: 'did:user',
        did: 'did:user',
        username: 'user',
        role: 'USER',
        location: LocationType.LOCAL,
        virtual: false,
        ...overrides,
    };
}

/** Fake DatabaseServer — records calls; configurable returns. */
export function makeDb(overrides = {}) {
    const calls = [];
    const rec = (name, ret) => async (...args) => { calls.push({ name, args }); return typeof ret === 'function' ? ret(...args) : ret; };
    const db = {
        __calls: calls,
        saveBlockState: rec('saveBlockState'),
        getBlockState: rec('getBlockState', null),
        getAllPolicyUsers: rec('getAllPolicyUsers', []),
        saveDocument: rec('saveDocument', (d) => d),
        getVcDocument: rec('getVcDocument', null),
        getVcDocuments: rec('getVcDocuments', []),
        getVpDocuments: rec('getVpDocuments', []),
        getDidDocument: rec('getDidDocument', null),
        getTokenById: rec('getTokenById', null),
        getAggregateDocuments: rec('getAggregateDocuments', []),
        getTags: rec('getTags', []),
        find: rec('find', []),
        findOne: rec('findOne', null),
        ...overrides,
    };
    return db;
}

/** Fake ComponentsService — provides databaseServer + log sinks. */
export function makeComponents(overrides = {}) {
    const db = overrides.databaseServer || makeDb();
    const logs = [];
    return {
        databaseServer: db,
        info: (m) => logs.push(['info', m]),
        error: (m) => logs.push(['error', m]),
        warn: (m) => logs.push(['warn', m]),
        debug: (m) => logs.push(['debug', m]),
        debugContext: async () => ({}),
        debugError: () => {},
        __logs: logs,
        ...overrides,
    };
}

export function makePolicy(overrides = {}) {
    return {
        id: 'policy-1',
        owner: 'did:owner',
        ownerId: 'did:owner',
        topicId: '0.0.1',
        status: PolicyStatus.PUBLISH,
        availability: PolicyAvailability.PRIVATE,
        locationType: LocationType.LOCAL,
        ...overrides,
    };
}

/**
 * Construct a real decorated execution block the way the engine does:
 *   new Block(uuid, defaultActive, tag, permissions, parent, options, components)
 *   .setPolicyInstance(policyId, policy) / setPolicyOwner / setTopicId
 * (setTenantContext is intentionally skipped so databaseServer stays the injected fake).
 */
export function makeBlock(BlockClass, opts = {}) {
    installDbStatics(opts.dbStatics || {});
    const components = opts.components || makeComponents(opts.componentsOverrides || {});
    const policy = opts.policy || makePolicy(opts.policyOverrides || {});
    const block = new BlockClass(
        opts.uuid ?? 'uuid-1',
        opts.defaultActive ?? true,
        opts.tag ?? 'tag-1',
        opts.permissions ?? [],
        opts.parent ?? null,
        opts.options ?? {},
        components,
    );
    if (typeof block.setPolicyInstance === 'function') {
        block.setPolicyInstance(opts.policyId ?? 'policy-1', policy);
    }
    if (typeof block.setPolicyOwner === 'function') {
        block.setPolicyOwner(policy.owner);
    }
    if (typeof block.setTopicId === 'function') {
        block.setTopicId(policy.topicId);
    }
    return { block, components, db: components.databaseServer, policy };
}
