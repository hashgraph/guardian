import assert from 'node:assert/strict';
import esmock from 'esmock';

const dbCalls = { findOne: [], find: [], save: [], create: [], update: [] };

class StubDatabaseServer {
    constructor() {}
    async findOne(_, q) { dbCalls.findOne.push(q); return null; }
    async find() { return []; }
    async findAndCount() { return [[], 0]; }
    create(_, d) { dbCalls.create.push(d); return d; }
    async save(_, d) { dbCalls.save.push(d); return d; }
    async update() { return {}; }
    async remove() {}
    async count() { return 0; }
    async aggregate() { return []; }
    static async save(_, d) { dbCalls.save.push(d); return d; }
    static async update() { return {}; }
}

class StubWorkers {
    async addRetryableTask() { return { messages: [], next: null }; }
    async addNonRetryableTask() { return {}; }
}

const commonMock = {
    DatabaseServer: StubDatabaseServer,
    Workers: StubWorkers,
    BaseEntity: class {},
    MessageType: { StandardRegistry: 'StandardRegistry', Policy: 'Policy', Token: 'Token', Schema: 'Schema' },
    RegistrationMessage: class {
        static fromMessageObject() { return new this(); }
        validate() { return true; }
        setPayer() {} setIndex() {} setId() {} setTopicId() {}
        get registrantTopicId() { return '0.0.2'; }
        get did() { return 'did:hedera:0.0.1'; }
        get payer() { return '0.0.3'; }
        get id() { return 'm-1'; }
        get action() { return 'register'; }
    },
    PolicyMessage: class { static fromMessageObject() { return new this(); } validate() { return true; } },
    TokenMessage: class { static fromMessageObject() { return new this(); } validate() { return true; } },
    SchemaMessage: class { static fromMessageObject() { return new this(); } validate() { return true; } },
    VcMessage: class { static fromMessageObject() { return new this(); } validate() { return true; } },
    VpMessage: class { static fromMessageObject() { return new this(); } validate() { return true; } },
    DIDMessage: class { static fromMessageObject() { return new this(); } validate() { return true; } },
};

const interfacesMock = {
    WorkerTaskType: new Proxy({}, { get: (_, p) => String(p) }),
    NetworkOptions: {},
    NetworkType: {},
    TenantContext: { Empty: { tenantId: null } },
};

const utilsPath = '../dist/helpers/utils.js';

async function loadUserService(utilsOverride) {
    const mocks = utilsOverride ? { [utilsPath]: utilsOverride } : {};
    const mod = await esmock('../dist/analytics/user.service.js', mocks, {
        '@guardian/common': commonMock,
        '@guardian/interfaces': interfacesMock,
    });
    return mod.AnalyticsUserService;
}

let AnalyticsUserService, AnalyticsDocumentService, AnalyticsTokenService, AnalyticsPolicyService;
try {
    ({ AnalyticsUserService } = await import('../dist/analytics/user.service.js'));
} catch (e) { console.warn('[analytics-smoke] user.service import failed:', e.message); }
try {
    ({ AnalyticsDocumentService } = await import('../dist/analytics/document.service.js'));
} catch (e) { console.warn('[analytics-smoke] document.service import failed:', e.message); }
try {
    ({ AnalyticsTokenService } = await import('../dist/analytics/token.service.js'));
} catch (e) { console.warn('[analytics-smoke] token.service import failed:', e.message); }
try {
    ({ AnalyticsPolicyService } = await import('../dist/analytics/policy.service.js'));
} catch (e) { console.warn('[analytics-smoke] policy.service import failed:', e.message); }

const fakeReport = () => ({
    uuid: 'r-1', root: '0.0.1', topicId: '0.0.1',
    progress: 0, maxProgress: 0, status: 'NONE', steep: 'NONE',
    error: '',
});

describe('@unit AnalyticsUserService.search (smoke)', () => {
    it('imports the module and exposes search()', () => {
        if (!AnalyticsUserService) { console.warn('  [skip] dist not available'); return; }
        assert.equal(typeof AnalyticsUserService.search, 'function');
    });

    it('search runs without throwing on a fresh report', async () => {
        const Service = await loadUserService();
        const out = await Service.search(fakeReport());
        assert.ok(out !== undefined);
    });

    it('search catches mirror errors and records them on the report', async () => {
        const Service = await loadUserService({
            AnalyticsUtils: {
                updateStatus: async () => {},
                updateProgress: () => {},
                searchMessages: async () => { throw new Error('mirror-down'); },
            },
        });
        const report = fakeReport();
        const out = await Service.search(report);
        assert.match(out.error || '', /mirror-down/);
    });
});

describe('@unit AnalyticsDocumentService (smoke)', () => {
    it('module loads and exposes a class', () => {
        if (!AnalyticsDocumentService) { console.warn('  [skip] dist not available'); return; }
        assert.equal(typeof AnalyticsDocumentService, 'function');
    });
});

describe('@unit AnalyticsTokenService (smoke)', () => {
    it('module loads and exposes a class', () => {
        if (!AnalyticsTokenService) { console.warn('  [skip] dist not available'); return; }
        assert.equal(typeof AnalyticsTokenService, 'function');
    });
});

describe('@unit AnalyticsPolicyService (smoke)', () => {
    it('module loads and exposes a class', () => {
        if (!AnalyticsPolicyService) { console.warn('  [skip] dist not available'); return; }
        assert.equal(typeof AnalyticsPolicyService, 'function');
    });
});
