// Shared NATS handler harness for guardian-service *.service.ts API functions.
//
// Guardian-service registers handlers via `ApiResponse(MessageAPI.X, cb)` /
// `ApiResponseSubscribe(...)` (see src/api/helpers/api-response.ts). Each service
// exports an `xxxAPI(logger)` function that, when invoked, calls ApiResponse once
// per handled event. This harness esmocks the service dist module so that:
//   - the relative import of `helpers/api-response.js` resolves to a CAPTURING
//     ApiResponse that records {event, cb} instead of touching real NATS, and
//   - `@guardian/common` resolves to lightweight fakes (no Mongo/NATS/Hedera).
// `@guardian/interfaces` is kept REAL so MessageAPI enum values are the actual
// event strings the production code branches on.
//
// Usage:
//   import { loadAPI, capturedHandlers, makeDb } from './_handler-harness.mjs';
//   const db = makeDb();
//   const handlers = await loadAPI('../dist/api/token.service.js', 'tokenAPI', {
//       '@guardian/common': { DatabaseServer: db.DatabaseServer },
//   });
//   const r = await handlers['SET_TOKEN']({ ... });   // r.body / r.error

import esmock from 'esmock';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Interfaces from '@guardian/interfaces';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

export const capturedHandlers = [];
export const capturedSubscribes = [];

// Each service's `xxxAPI(logger)` registers handlers via `ApiResponse(event, cb)`
// (src/api/helpers/api-response.ts), which wraps cb in an ApplicationState check
// and forwards to NATS. We replace that whole module with a capturing stub passed
// as an esmock GLOBAL mock, so the raw handler is recorded with no state gate and
// no NATS — and crucially without esmock having to deep-rewrite @guardian/common.
// esmock's ESM cache lookup is broken by Windows backslashes in dist path-keys;
// a forward-slash absolute path key works (a file:// URL is rejected as invalid).
const apiResponsePath = path.join(distDir, 'api/helpers/api-response.js').split(path.sep).join('/');

function makeApiResponseStub() {
    return {
        ApiResponse(event, handleFunc) { capturedHandlers.push({ event, cb: handleFunc }); },
        ApiResponseSubscribe(event, handleFunc) { capturedSubscribes.push({ event, cb: handleFunc }); },
    };
}

export class MessageResponse {
    constructor(body, code) { this.body = body; this.code = code ?? 200; this.type = 'response'; }
}
export class MessageError {
    constructor(error, code) {
        this.error = error instanceof Error ? error.message : error;
        this.code = code ?? 500;
        this.type = 'error';
    }
}
export class BinaryMessageResponse extends MessageResponse {}
export class ArrayMessageResponse {
    constructor(body, count) { this.body = body; this.count = count; this.type = 'array'; }
}
export class MessageInitialization { constructor() { this.type = 'init'; } }

/**
 * Build a configurable in-memory DatabaseServer + DataBaseHelper pair plus a
 * recording sink. Tests set `db.sink.findOne.<Entity>` / `db.sink.find.<Entity>`
 * etc. to a value OR a function; created/saved/updated/removed rows and aggregate
 * pipelines are recorded under `db.sink`.
 *
 * Arg convention for configured FUNCTIONS:
 *   - DataBaseHelper instance methods (entity is in the constructor): the function
 *     receives the call args verbatim, e.g. find(query) -> fn(query).
 *   - DatabaseServer instance methods (entity is the FIRST call arg): the entity is
 *     stripped and the function receives the REMAINING args, e.g.
 *     dataBaseServer.find(Token, query, options) -> fn(query, options).
 * Either way the sink key is the entity's class name ('Token', 'User', ...).
 */
export function makeDb() {
    const sink = {
        findOne: {}, find: {}, findAndCount: {}, count: {}, aggregate: {},
        created: [], saved: [], updated: [], removed: [], aggregateCalls: [],
    };
    const resolve = (table, name, args, fallback) => {
        const v = sink[table][name];
        const r = typeof v === 'function' ? v(...args) : v;
        return r === undefined ? fallback : r;
    };
    class DataBaseHelper {
        constructor(Entity, tenantId) {
            this.name = Entity && Entity.name ? Entity.name : String(Entity);
            this.tenantId = tenantId;
        }
        async findOne(...a) { return resolve('findOne', this.name, a, null); }
        async find(...a) { return resolve('find', this.name, a, []); }
        async findAndCount(...a) { return resolve('findAndCount', this.name, a, [[], 0]); }
        async count(...a) { return resolve('count', this.name, a, 0); }
        create(data) { const row = { id: 'gen-' + (sink.created.length + 1), ...data }; sink.created.push({ entity: this.name, row }); return row; }
        async save(row) { sink.saved.push({ entity: this.name, row }); return row; }
        async update(row) { sink.updated.push({ entity: this.name, row }); return row; }
        async remove(row) { sink.removed.push({ entity: this.name, row }); }
        async delete() {}
        async aggregate(pipeline) { sink.aggregateCalls.push({ entity: this.name, pipeline }); return resolve('aggregate', this.name, [pipeline], []); }
    }
    // DatabaseServer exposes both instance methods and a large pile of statics;
    // back them all by the same sink so either calling convention works.
    class DatabaseServer {
        constructor(tenantId) { this.tenantId = tenantId; }
        async findOne(entity, ...a) { return resolve('findOne', entityName(entity), a, null); }
        async find(entity, ...a) { return resolve('find', entityName(entity), a, []); }
        async findAndCount(entity, ...a) { return resolve('findAndCount', entityName(entity), a, [[], 0]); }
        async count(entity, ...a) { return resolve('count', entityName(entity), a, 0); }
        create(entity, d) { const row = { id: 'gen-' + (sink.created.length + 1), ...(d || {}) }; sink.created.push({ entity: entityName(entity), row }); return row; }
        async save(entity, d) { sink.saved.push({ entity: entityName(entity), row: d }); return d; }
        async update(entity, _f, d) { sink.updated.push({ entity: entityName(entity), row: d }); return d; }
        async remove(entity, d) { sink.removed.push({ entity: entityName(entity), row: d }); }
        async aggregate(entity, pipeline) { sink.aggregateCalls.push({ entity: entityName(entity), pipeline }); return resolve('aggregate', entityName(entity), [pipeline], []); }
    }
    const entityName = (e) => (e && e.name ? e.name : String(e));
    // Mirror common statics that handlers reach for; default no-op returns.
    const staticNoops = ['saveTopic', 'getTopic', 'savePolicy', 'getPolicy', 'getPolicyById', 'getSchemaById', 'getToken', 'getTokenById', 'createMongoRepository'];
    for (const m of staticNoops) DatabaseServer[m] = async () => null;
    return { DataBaseHelper, DatabaseServer, sink };
}

export class FakeWorkers {
    constructor(ctx) { this.ctx = ctx; FakeWorkers.constructedWith.push(ctx); }
    async addRetryableTask(task, opts) { FakeWorkers.tasks.push({ task, opts }); return FakeWorkers.nextResult; }
    async addNonRetryableTask(task, opts) { FakeWorkers.tasks.push({ task, opts }); return FakeWorkers.nextResult; }
}
FakeWorkers.tasks = [];
FakeWorkers.constructedWith = [];
FakeWorkers.nextResult = { tokenId: '0.0.99', treasuryKey: 'tk', adminKey: 'ak' };

export class FakeWallet {
    async getUserKey() { return 'fake-key'; }
    async setUserKey() {}
    async getKey() { return 'fake-key'; }
    async setKey() {}
}

export class FakeUsers {
    async getUser() { return { id: 'u-1', did: 'did:hedera:0.0.1', hederaAccountId: '0.0.1' }; }
    async getUserById() { return { id: 'u-1', did: 'did:hedera:0.0.1' }; }
    async getHederaAccount() { return { hederaAccountId: '0.0.1', hederaAccountKey: 'key', did: 'did:hedera:0.0.1' }; }
}

const proxyEnum = () => new Proxy({}, { get: (_, p) => `Enum.${String(p)}` });

function defaultCommonMocks(db) {
    return {
        MessageResponse, MessageError, BinaryMessageResponse, ArrayMessageResponse, MessageInitialization,
        DataBaseHelper: db.DataBaseHelper,
        DatabaseServer: db.DatabaseServer,
        Workers: FakeWorkers,
        Wallet: FakeWallet,
        Users: FakeUsers,
        MgsUsers: FakeUsers,
        PinoLogger: class { static async error() {} async error() {} async info() {} async warn() {} async debug() {} },
        NewNotifier: async () => ({ start() {}, completed() {}, completedAndStart() {}, sendStatus() {}, finish() {}, result: () => ({}), createStep: () => ({ start() {}, complete() {} }), addStep() {} }),
        NotificationHelper: { success: async () => {}, error: async () => {} },
        RunFunctionAsync: async (fn) => { try { await fn(() => {}); } catch (_) {} },
        KeyType: new Proxy({}, { get: (_, p) => String(p) }),
        TopicType: new Proxy({}, { get: (_, p) => String(p) }),
        extractTenantContext: (msg) => ({ tenantId: msg?.tenantId || null }),
        ApplicationState: class { getState() { return Interfaces.ApplicationStates ? Interfaces.ApplicationStates.READY : 'READY'; } updateState() {} },
        Singleton: (t) => t,
        SecretManager: { New: async () => ({ getSecrets: async () => null, setSecrets: async () => {} }) },
        IAuthUser: class {},
    };
}

/**
 * Load a service dist module under esmock, invoke its API function to capture
 * handlers, and return a map of { eventString: callback }.
 *
 * @param {string} distPath   e.g. '../dist/api/token.service.js' (relative to a test file)
 * @param {string} apiFnName  e.g. 'tokenAPI'
 * @param {object} overrides  partial module overrides; '@guardian/common' is merged
 *                            into the defaults, other keys replace wholesale.
 * @param {Array}  apiArgs    extra args after logger for multi-arg API fns.
 */
export async function loadAPI(distPath, apiFnName, overrides = {}, apiArgs = []) {
    const db = overrides.__db || makeDb();
    const commonDefaults = defaultCommonMocks(db);
    const mergedCommon = { ...commonDefaults, ...(overrides['@guardian/common'] || {}) };
    const mergedInterfaces = { ...Interfaces, ...(overrides['@guardian/interfaces'] || {}) };
    // Local mocks: applied to the target module. Extra path-keyed overrides go here.
    const local = {
        '@guardian/common': mergedCommon,
        '@guardian/interfaces': mergedInterfaces,
    };
    for (const [k, v] of Object.entries(overrides)) {
        if (k === '@guardian/common' || k === '@guardian/interfaces' || k === '__db') continue;
        local[k] = v;
    }
    // Global mocks: applied across the import tree by resolved path. We only swap
    // the tiny api-response.js module (capturing stub) — NOT all of common — so
    // esmock stays fast.
    const globals = {
        [apiResponsePath]: makeApiResponseStub(),
    };
    const absDist = path.resolve(__dirname, distPath);
    const mod = await esmock(absDist, local, globals);
    const start = capturedHandlers.length;
    const logger = { error: async () => {}, info: async () => {}, warn: async () => {}, debug: async () => {} };
    await mod[apiFnName](logger, ...apiArgs);
    const mine = capturedHandlers.slice(start);
    const map = {};
    for (const { event, cb } of mine) map[event] = cb;
    return { handlers: map, db, mod, raw: mine };
}

export { Interfaces };

// ---------------------------------------------------------------------------
// Real-module handler harness (register/callHandler/stub/...).
//
// A second family of *-handlers.test.mjs suites exercises the service API
// functions against the REAL @guardian/common (real DatabaseServer / DataBaseHelper
// statics, real MessageResponse/MessageError) instead of esmock fakes, then stubs
// the specific statics/prototypes each test needs. This avoids esmock when the
// test wants to drive behaviour through the genuine class it imports.
//
// register(apiFn, logger) runs the already-imported API function with NATS
// neutralised: GuardiansNatsService.prototype.registerListener / .subscribe are
// patched to CAPTURE {event, cb} (no broker), and ApplicationState.getState() is
// forced to READY so the api-response gate lets handlers through.
// ---------------------------------------------------------------------------
import * as Common from '@guardian/common';
import { GuardiansNatsService } from '../dist/helpers/guardians.js';

export const common = Common;
export const DatabaseServer = Common.DatabaseServer;
export const DataBaseHelper = Common.DataBaseHelper;

// ApiResponse wraps each handler in a state gate: the captured callback closes over
// a `new ApplicationState()` and returns MessageInitialization unless getState() is
// READY. That gate is evaluated at call time (in callHandler), so the override must
// be permanent for these suites rather than scoped to register(). The esmock-based
// suites replace ApplicationState wholesale, so patching the real prototype here is
// inert for them.
const _READY = Interfaces.ApplicationStates ? Interfaces.ApplicationStates.READY : 'READY';
Common.ApplicationState.prototype.getState = function () { return _READY; };

export function silentLogger() {
    return { error: async () => {}, info: async () => {}, warn: async () => {}, debug: async () => {} };
}

// Treat any non-error MessageResponse-shaped result as ok; MessageError sets `error`.
export function isError(r) {
    return !!(r && r.type === 'error') || !!(r && r.error != null && r.body == null);
}
export function ok(r) {
    return !!r && !isError(r) && r.type !== 'init';
}

const _stubs = [];
/** Replace own property obj[name] with fn; record original for restoreStubs(). */
export function stub(obj, name, fn) {
    const had = Object.prototype.hasOwnProperty.call(obj, name);
    _stubs.push({ obj, name, had, orig: obj[name] });
    obj[name] = fn;
    return fn;
}
/** Stub a method on a class's prototype. */
export function stubProto(Class, name, fn) {
    return stub(Class.prototype, name, fn);
}
/** Restore everything installed via stub()/stubProto(). */
export function restoreStubs() {
    while (_stubs.length) {
        const { obj, name, had, orig } = _stubs.pop();
        if (had) obj[name] = orig;
        else delete obj[name];
    }
}

// DataBaseHelper's constructor throws unless DataBaseHelper.orm is set. Tests that
// stub the prototype methods only need the constructor to pass, so install a minimal
// fake ORM (the stubbed methods never touch `_em`).
export function ensureOrm() {
    if (!DataBaseHelper.orm) {
        DataBaseHelper.orm = { em: { fork: () => ({}), getRepository: () => ({}) } };
    }
    return DataBaseHelper.orm;
}

/**
 * Run a service API function and capture its handlers without touching NATS.
 * @param {Function} apiFn  e.g. analyticsAPI (imported from dist)
 * @param {object}   logger optional; defaults to silentLogger()
 * @param  {...any}  apiArgs extra args after logger
 * @returns {object} map of { eventString: cb }
 */
export async function register(apiFn, logger = silentLogger(), ...apiArgs) {
    const captured = [];
    const proto = GuardiansNatsService.prototype;
    const origRL = proto.registerListener;
    const hadSub = Object.prototype.hasOwnProperty.call(proto, 'subscribe');
    const origSub = proto.subscribe;
    proto.registerListener = function (event, cb) { captured.push({ event, cb }); };
    proto.subscribe = function (event, cb) { captured.push({ event, cb }); };
    try {
        await apiFn(logger, ...apiArgs);
    } finally {
        proto.registerListener = origRL;
        if (hadSub) proto.subscribe = origSub; else delete proto.subscribe;
    }
    const map = {};
    for (const { event, cb } of captured) map[event] = cb;
    return map;
}

/** Invoke a captured handler by event with the given message payload. */
export function callHandler(handlers, event, msg) {
    const cb = handlers[event];
    if (typeof cb !== 'function') {
        throw new Error(`No handler registered for event: ${String(event)}`);
    }
    return cb(msg);
}
