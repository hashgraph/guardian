// Shared NATS handler harness — loads a dist service via esmock with
// @guardian/common + @guardian/interfaces (and common transitive deps)
// stubbed so the real ESM imports in dist resolve to lightweight fakes.
//
// Module._load (CJS) does not intercept ESM static imports inside the
// "type": "module" dist bundle, so any test that needs to instantiate a
// dist class must use loadService(...) instead of `await import(...)`.

import esmock from 'esmock';

export const capturedHandlers = [];

export const stubs = {
    nextUser: { id: 'u-1', username: 'alice', email: 'a@x', role: 'USER', did: 'did:hedera:0.0.1', parent: null, permissionsGroup: [], permissions: [], hederaAccountId: '0.0.1', walletToken: 'w-1' },
    nextRole: { id: 'r-1', name: 'Role', owner: 'u-1', permissions: ['P'], default: false, readonly: false, uuid: 'role-uuid' },
};

export class StubMessageResponse { constructor(body) { this.body = body; this.type = 'response'; } }
export class StubMessageError { constructor(err) { this.error = err; this.type = 'error'; } }
export class StubMessageErrorWrongInput extends StubMessageError {}
export class StubBinaryMessageResponse extends StubMessageResponse {}
export class StubMessageInitialization { constructor() { this.type = 'init'; } }

class StubNatsService {
    messageQueueName = 'stub';
    replySubject = 'stub-reply';
    async init() {}
    async sendMessage() { return null; }
    publish() {}
    subscribe() { return { unsubscribe: () => {} }; }
    getMessages(event, cb) { capturedHandlers.push({ event, cb }); return { unsubscribe: () => {} }; }
}

class StubDataBaseHelper {
    constructor(EntityClass, tenantId) {
        this.entity = EntityClass?.name || String(EntityClass);
        this.tenantId = tenantId;
    }
    async findOne() { return stubs.nextUser; }
    async find() { return []; }
    async findAndCount() { return [[], 0]; }
    async count() { return 0; }
    async create(data) { return { _id: 'new', ...data }; }
    async save(_, data) { return data || { _id: 'saved' }; }
    async update() { return stubs.nextUser; }
    async remove() {}
    async delete() {}
    async aggregate() { return []; }
}

class StubDatabaseServer {
    constructor() {}
    async findOne() { return stubs.nextUser; }
    async find() { return []; }
    async findAndCount() { return [[], 0]; }
    async count() { return 0; }
    create(_, d) { return d || {}; }
    async save(_, d) { return d || {}; }
    async update() { return stubs.nextUser; }
    async remove() {}
    async aggregate() { return []; }
}

class StubWallet {
    async getKey() { return 'fake-key'; }
    async setKey() {}
    async getGlobalApplicationKey() { return 'global-key'; }
    async setGlobalApplicationKey() {}
}

class StubWorkers {
    async addRetryableTask() { return { balance: 0, balanceTinybar: 0 }; }
    async addNonRetryableTask() { return { balance: 0, hederaAccountId: '0.0.1', key: 'k' }; }
}

class StubUsers {
    async getUser() { return stubs.nextUser; }
    async getUserById() { return stubs.nextUser; }
    async updateUser() { return stubs.nextUser; }
}

const proxyEnum = () => new Proxy({}, { get: (_, p) => `Enum.${String(p)}` });

const guardianCommonMocks = {
    NatsService: StubNatsService,
    Singleton: (t) => t,
    MessageError: StubMessageError,
    MessageErrorWrongInput: StubMessageErrorWrongInput,
    MessageResponse: StubMessageResponse,
    MessageInitialization: StubMessageInitialization,
    BinaryMessageResponse: StubBinaryMessageResponse,
    DataBaseHelper: StubDataBaseHelper,
    DatabaseServer: StubDatabaseServer,
    PinoLogger: class { async error() {} async info() {} async warn() {} async debug() {} },
    Wallet: StubWallet,
    Workers: StubWorkers,
    Users: StubUsers,
    MgsUsers: StubUsers,
    IAuthUser: class {},
    KeyType: { KEY: 'KEY', RELAYER_ACCOUNT: 'RELAYER_ACCOUNT' },
    KeyEntity: class {},
    ApplicationState: class { getState() { return 'READY'; } },
    NotificationHelper: { success: async () => {}, error: async () => {} },
    SecretManager: { New: async () => ({ getSecrets: async () => null, setSecrets: async () => {} }) },
    SecretManagerBase: class {},
    SecretManagerType: { HCP_VAULT: 'hcp', MSG_HCP_VAULT: 'hashicorp' },
    TenantSecretManager: class { async getSecrets() { return null; } async setSecrets() {} },
    MgsGuardians: class { async deleteAllUserData() {} async getPolicyById() { return { id: 'p-1', name: 'demo' }; } },
    ProviderAuthUser: class {},
    extractTenantContext: (msg) => ({ tenantId: msg?.tenantId || null, fromTenantId: (id) => ({ tenantId: id }) }),
};

const guardianInterfacesMocks = {
    GenerateUUIDv4: () => 'uuid-' + Math.random().toString(36).slice(2),
    AuthEvents: proxyEnum(),
    MgsAuthEvents: proxyEnum(),
    WalletEvents: proxyEnum(),
    MessageAPI: proxyEnum(),
    MgsMessageAPI: proxyEnum(),
    WorkerTaskType: proxyEnum(),
    UserRole: { ADMIN: 'ADMIN', STANDARD_REGISTRY: 'STANDARD_REGISTRY', USER: 'USER', AUDITOR: 'AUDITOR' },
    NetworkType: { MAINNET: 'mainnet', TESTNET: 'testnet', PREVIEWNET: 'previewnet', LOCALNODE: 'localnode', NA: 'N/A' },
    LocationType: { LOCAL: 'LOCAL', REMOTE: 'REMOTE' },
    NetworkOptions: {},
    TenantContext: { Empty: { tenantId: null }, fromTenantId: (id) => ({ tenantId: id }) },
    AdminDefaultPermission: ['ADMIN'],
    AuditDefaultPermission: ['AUDIT'],
    PermissionsArray: [],
    FeatureTypes: proxyEnum(),
    NotificationAction: proxyEnum(),
    PasswordType: { OLD: 'OLD', NEW: 'NEW' },
    RoleMapTypes: proxyEnum(),
    SubscriptionChangeReasons: proxyEnum(),
    SubscriptionCodes: proxyEnum(),
    SubscriptionNotifications: proxyEnum(),
    SubscriptionPeriods: proxyEnum(),
    SubscriptionRequestStatuses: proxyEnum(),
    SubscriptionStatuses: proxyEnum(),
    SubscriptionTenantNotifications: proxyEnum(),
    TenantAtpLogTypesIncomingMap: {},
    TenantLimitExcessReason: proxyEnum(),
    TenantMigrationStatus: proxyEnum(),
    TermsVersions: { TERMS_V1: 'v1' },
    TenantAtpLogTypesIncomingMap: {},
    IGroup: class {},
    IOwner: class {},
    IPermissionsMapPair: class {},
    IRoleMap: class {},
    IAuthUser: class {},
    ISubscriptionInfo: class {},
    ISubscriptionBaseInfo: class {},
    ISubscriptionRequestBilling: class {},
    SubscriptionRequest: class {},
    ITenantResponse: class {},
    IUser: class {},
};

/**
 * Merge a per-call override into the default mock map.
 * `overrides['@guardian/common']` is a partial: `{ Wallet: CustomWallet }` only
 * replaces `Wallet`, the rest of the default common stub stays in place.
 */
function mergeMocks(overrides) {
    const merged = {
        '@guardian/common': { ...guardianCommonMocks, ...(overrides?.['@guardian/common'] || {}) },
        '@guardian/interfaces': { ...guardianInterfacesMocks, ...(overrides?.['@guardian/interfaces'] || {}) },
    };
    for (const [k, v] of Object.entries(overrides || {})) {
        if (k === '@guardian/common' || k === '@guardian/interfaces') continue;
        merged[k] = v;
    }
    return merged;
}

/**
 * Load a dist module under esmock with the default @guardian/common +
 * @guardian/interfaces stubs. Returns the loaded namespace object.
 */
export async function loadService(distPath, overrides = {}, globals = undefined) {
    if (globals) {
        return await esmock(distPath, mergeMocks(overrides), globals);
    }
    return await esmock(distPath, mergeMocks(overrides));
}

export { mergeMocks };

// Kept as no-ops for any caller that hasn't migrated yet. Tests should use
// loadService(...) instead.
export function installHarness() {}
export function restoreHarness() { capturedHandlers.length = 0; }
