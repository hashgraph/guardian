import { assert } from 'chai';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadAPI, Interfaces, MessageResponse, MessageError } from './_handler-harness.mjs';

// Regression tests: an external (VIEW) policy whose tool closure fails to import
// must not be approved.
//
// A policy zip carries its tools as messageId REFERENCES only - their schemas are
// re-fetched from Hedera+IPFS per tool at import time. When those fetches fail,
// importToolByMessage throws, importSubTools collects the failures into a
// non-fatal error list, importPolicy persists the policy row anyway (it saves
// before it evaluates errors), and APPROVE_EXTERNAL_POLICY marks the request
// APPROVED regardless and returns MessageResponse(true).
//
// The importer is left with a VIEW policy holding 0 tools and 0 TOOL schemas,
// which can never generate ('Can not find schema with IRI: ...'), with no retry
// path and no user-visible failure - recoverable only by manual DB surgery.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = (rel) => path.resolve(__dirname, rel).split(path.sep).join('/');
const importHelpersPath = p('../dist/helpers/import-helpers/index.js');
const policyEnginePath = p('../dist/policy-engine/policy-engine.js');

const M = Interfaces.MessageAPI;
const ExternalPolicyStatus = Interfaces.ExternalPolicyStatus;

const flushAsync = () => Promise.all(store.asyncPromises);

const OWNER = { creator: 'did:creator', owner: 'did:owner', username: 'alice', id: 'u-1' };
const MESSAGE_ID = '1700000000.000000000';

// Two failing tools, carrying the error importToolByMessage now surfaces
// (previously flattened to the literal 'Invalid tool').
const TOOL_ERRORS = [
    { type: 'tool', name: 'Tool A', messageId: '1600000000.000000000', error: 'Request failed with status code 404' },
    { type: 'tool', name: 'Tool B', messageId: '1650000000.000000000', error: 'Request failed with status code 404' },
];

let handlers;
let store;

const fakeNotifier = {
    addStep() { return fakeNotifier; }, start() {}, startStep() {}, completeStep() {},
    complete() {}, fail(msg) { store.notifierFailures.push(msg); },
    result(r) { store.notifierResults.push(r); }, getStep() { return fakeNotifier; },
};

function makeDatabaseServer() {
    class DatabaseServer {
        static async getPolicy(filter) {
            return typeof store.policy === 'function' ? store.policy(filter) : store.policy;
        }
        static async getExternalPolicies(filter) { return store.externalPolicies; }
        static async updateExternalPolicy(item) {
            store.updated.push({ status: item.status });
            return item;
        }
        static async assignEntity(type, policyId, flag, user, owner) {
            store.assigned.push({ policyId, user });
        }
        static async getAssignedEntity() { return null; }
    }
    return DatabaseServer;
}

before(async function () {
    this.timeout(120000);

    const loaded = await loadAPI('../dist/api/external-policies.service.js', 'externalPoliciesAPI', {
        '@guardian/common': {
            DatabaseServer: makeDatabaseServer(),
            NewNotifier: { empty: () => fakeNotifier, create: async () => fakeNotifier },
            // Default harness RunFunctionAsync swallows throws; record them so the
            // async handler's failure path is assertable.
            // The production handler fires RunFunctionAsync without awaiting it,
            // so the test must be able to join the background work rather than
            // race it. Keep the promise for flushAsync().
            RunFunctionAsync: (fn, onError) => {
                const promise = (async () => {
                    try { await fn(() => {}); } catch (error) {
                        store.asyncErrors.push(error?.message || String(error));
                        if (onError) { await onError(error); }
                    }
                })();
                store.asyncPromises.push(promise);
                return promise;
            },
        },
        [importHelpersPath]: {
            ImportMode: { VIEW: 'VIEW', DEMO: 'DEMO', COMMON: 'COMMON' },
            ImportPolicyOptions: class {
                constructor() {}
                setComponents() { return this; }
                setUser() { return this; }
                setAdditionalPolicy() { return this; }
            },
            PolicyImportExportHelper: {
                async loadPolicyMessage() { return { policy: {}, tools: [], schemas: [] }; },
                async importPolicy() {
                    store.importCalls++;
                    return { policy: store.importedPolicy, errors: store.importErrors };
                },
                errorsMessage(errors) {
                    return errors.map((e) => `${e.type}:${e.name}:${e.error}`).join('; ');
                },
            },
        },
        [policyEnginePath]: {
            PolicyEngine: class {
                async startView(policy) { store.startViewCalls.push(policy?.id); }
                async deleteViewPolicy(policy) {
                    store.deleteViewCalls.push(policy?.id);
                    if (store.deleteViewThrows) { throw new Error('cleanup exploded'); }
                    return true;
                }
            },
        },
    });
    handlers = loaded.handlers;
});

beforeEach(() => {
    store = {
        policy: null,
        externalPolicies: [{ id: 'ext-1', messageId: MESSAGE_ID, creator: 'did:requester' }],
        updated: [],
        assigned: [],
        importCalls: 0,
        importErrors: [],
        importedPolicy: { id: 'policy-1', status: 'VIEW' },
        startViewCalls: [],
        deleteViewCalls: [],
        deleteViewThrows: false,
        notifierFailures: [],
        notifierResults: [],
        asyncErrors: [],
        asyncPromises: [],
    };
});

describe('@unit APPROVE_EXTERNAL_POLICY does not approve a partial import ', () => {
    it('returns an error instead of approving when the tool closure fails', async () => {
        store.importErrors = TOOL_ERRORS;
        const r = await handlers[M.APPROVE_EXTERNAL_POLICY]({ messageId: MESSAGE_ID, owner: OWNER });

        assert.instanceOf(r, MessageError, 'a failed import must not report success');
        assert.include(r.error, 'Failed to import policy');
    });

    it('leaves the external policy request un-approved when the import fails', async () => {
        store.importErrors = TOOL_ERRORS;
        await handlers[M.APPROVE_EXTERNAL_POLICY]({ messageId: MESSAGE_ID, owner: OWNER });

        assert.deepEqual(
            store.updated.filter((u) => u.status === ExternalPolicyStatus.APPROVED),
            [],
            'the request must not be flipped to APPROVED'
        );
        assert.deepEqual(store.assigned, [], 'a broken policy must not be assigned to users');
    });

    it('surfaces the underlying tool error, not a generic message', async () => {
        store.importErrors = TOOL_ERRORS;
        const r = await handlers[M.APPROVE_EXTERNAL_POLICY]({ messageId: MESSAGE_ID, owner: OWNER });

        assert.include(r.error, 'Tool A');
        assert.include(r.error, 'Request failed with status code 404');
        assert.notInclude(r.error, 'Invalid tool');
    });

    it('rolls back the partially imported view policy so a retry can re-import', async () => {
        store.importErrors = TOOL_ERRORS;
        await handlers[M.APPROVE_EXTERNAL_POLICY]({ messageId: MESSAGE_ID, owner: OWNER });

        assert.deepEqual(store.deleteViewCalls, ['policy-1'], 'the orphan VIEW policy must be removed');
        assert.deepEqual(store.startViewCalls, [], 'a failed import must not start the policy');
    });

    it('does not mask the import error when the rollback itself fails', async () => {
        store.importErrors = TOOL_ERRORS;
        store.deleteViewThrows = true;
        const r = await handlers[M.APPROVE_EXTERNAL_POLICY]({ messageId: MESSAGE_ID, owner: OWNER });

        assert.instanceOf(r, MessageError);
        assert.include(r.error, 'Failed to import policy');
        assert.notInclude(r.error, 'cleanup exploded');
    });

    it('still approves and assigns on a clean import', async () => {
        store.importErrors = [];
        store.policy = (filter) => ({ id: 'policy-1', messageId: filter.messageId, status: 'VIEW' });
        const r = await handlers[M.APPROVE_EXTERNAL_POLICY]({ messageId: MESSAGE_ID, owner: OWNER });

        assert.instanceOf(r, MessageResponse);
        assert.isTrue(r.body);
        assert.isAbove(
            store.updated.filter((u) => u.status === ExternalPolicyStatus.APPROVED).length,
            0,
            'a clean import must still be approved'
        );
        assert.isAbove(store.assigned.length, 0);
        assert.deepEqual(store.deleteViewCalls, [], 'nothing to roll back on success');
    });

    it('skips import entirely when the policy already exists', async () => {
        store.policy = { id: 'policy-1', status: 'VIEW' };
        await handlers[M.APPROVE_EXTERNAL_POLICY]({ messageId: MESSAGE_ID, owner: OWNER });

        assert.equal(store.importCalls, 0);
        assert.deepEqual(store.deleteViewCalls, []);
    });
});

describe('@unit APPROVE_EXTERNAL_POLICY_ASYNC does not approve a partial import ', () => {
    it('fails the task and does not approve when the tool closure fails', async () => {
        store.importErrors = TOOL_ERRORS;
        const r = await handlers[M.APPROVE_EXTERNAL_POLICY_ASYNC]({
            messageId: MESSAGE_ID, owner: OWNER, task: { taskId: 't-1' },
        });
        await flushAsync();

        // The handler itself returns the task; the failure surfaces through the
        // async runner's error callback.
        assert.instanceOf(r, MessageResponse);
        assert.equal(store.asyncErrors.length, 1);
        assert.include(store.asyncErrors[0], 'Failed to import policy');
        assert.deepEqual(
            store.updated.filter((u) => u.status === ExternalPolicyStatus.APPROVED),
            []
        );
        assert.deepEqual(store.assigned, []);
        assert.deepEqual(store.deleteViewCalls, ['policy-1']);
    });

    it('approves normally on a clean import', async () => {
        store.importErrors = [];
        store.policy = (filter) => ({ id: 'policy-1', messageId: filter.messageId, status: 'VIEW' });
        await handlers[M.APPROVE_EXTERNAL_POLICY_ASYNC]({
            messageId: MESSAGE_ID, owner: OWNER, task: { taskId: 't-1' },
        });
        await flushAsync();

        assert.deepEqual(store.asyncErrors, []);
        assert.isAbove(
            store.updated.filter((u) => u.status === ExternalPolicyStatus.APPROVED).length,
            0
        );
        assert.deepEqual(store.deleteViewCalls, []);
    });
});
