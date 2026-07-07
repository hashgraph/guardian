import assert from 'node:assert/strict';
import { makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { GenerateDID } from '../../../dist/policy-engine/policy-actions/generate-did.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { MessageServer } from '@guardian/common';
import { LocationType } from '@guardian/interfaces';

const flush = () => new Promise((resolve) => setImmediate(resolve));

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

describe('@unit customLogicBlock bulk processing (#6346)', () => {
    const processItems = (items, task, ref = { components: {} }) =>
        CustomLogicBlock.prototype.processItems(items, task, ref);

    let envBackup;

    beforeEach(() => {
        envBackup = process.env.CUSTOM_LOGIC_CONCURRENCY;
        delete process.env.CUSTOM_LOGIC_CONCURRENCY;
    });

    afterEach(() => {
        if (envBackup === undefined) {
            delete process.env.CUSTOM_LOGIC_CONCURRENCY;
        } else {
            process.env.CUSTOM_LOGIC_CONCURRENCY = envBackup;
        }
    });

    after(() => restoreHarness());

    function trackedTasks(count) {
        const gates = [];
        const started = [];
        let inFlight = 0;
        let maxInFlight = 0;
        const task = async (json) => {
            started.push(json.i);
            inFlight++;
            maxInFlight = Math.max(maxInFlight, inFlight);
            const gate = deferred();
            gates.push(gate);
            await gate.promise;
            inFlight--;
            return { processed: json.i };
        };
        const items = Array.from({ length: count }, (_, i) => ({ i }));
        return {
            items,
            task,
            started,
            gates,
            maxInFlight: () => maxInFlight,
            releaseAll: async () => {
                while (gates.some((g) => g)) {
                    for (let i = 0; i < gates.length; i++) {
                        if (gates[i]) {
                            gates[i].resolve();
                            gates[i] = null;
                        }
                    }
                    await flush();
                }
            },
        };
    }

    it('preserves input order in the results regardless of completion order', async () => {
        const t = trackedTasks(5);
        const pending = processItems(t.items, t.task);
        await flush();
        for (let i = t.gates.length - 1; i >= 0; i--) {
            t.gates[i].resolve();
            t.gates[i] = null;
            await flush();
        }
        const results = await pending;
        assert.deepEqual(results.map((r) => r.processed), [0, 1, 2, 3, 4]);
    });

    it('runs at most 10 items concurrently by default', async () => {
        const t = trackedTasks(25);
        const pending = processItems(t.items, t.task);
        await flush();
        assert.equal(t.started.length, 10, 'only the first 10 items start immediately');
        await t.releaseAll();
        const results = await pending;
        assert.equal(results.length, 25);
        assert.equal(t.maxInFlight(), 10);
    });

    it('honours CUSTOM_LOGIC_CONCURRENCY', async () => {
        process.env.CUSTOM_LOGIC_CONCURRENCY = '3';
        const t = trackedTasks(9);
        const pending = processItems(t.items, t.task);
        await flush();
        assert.equal(t.started.length, 3);
        await t.releaseAll();
        await pending;
        assert.equal(t.maxInFlight(), 3);
    });

    it('falls back to the default limit when CUSTOM_LOGIC_CONCURRENCY is invalid', async () => {
        for (const bad of ['0', '-2', 'abc']) {
            process.env.CUSTOM_LOGIC_CONCURRENCY = bad;
            const t = trackedTasks(12);
            const pending = processItems(t.items, t.task);
            await flush();
            assert.equal(t.started.length, 10, `invalid value "${bad}" falls back to 10`);
            await t.releaseAll();
            await pending;
        }
    });

    it('processes sequentially and in order while recording or replaying', async () => {
        process.env.CUSTOM_LOGIC_CONCURRENCY = '10';
        const t = trackedTasks(6);
        const ref = { components: { runAndRecordController: {} } };
        const pending = processItems(t.items, t.task, ref);
        for (let i = 0; i < 6; i++) {
            await flush();
            t.gates[i].resolve();
            t.gates[i] = null;
        }
        const results = await pending;
        assert.equal(t.maxInFlight(), 1, 'no overlap under record/replay');
        assert.deepEqual(t.started, [0, 1, 2, 3, 4, 5], 'items start strictly in order');
        assert.deepEqual(results.map((r) => r.processed), [0, 1, 2, 3, 4, 5]);
    });

    it('rejects when any item fails', async () => {
        const items = [{ i: 0 }, { i: 1 }, { i: 2 }];
        const task = async (json) => {
            if (json.i === 1) {
                throw new Error('boom on item 1');
            }
            return json;
        };
        await assert.rejects(() => processItems(items, task), /boom on item 1/);
    });
});

describe('@unit GenerateDID.local batch reuse (#6346)', () => {
    const origGetOrCreateTopic = PolicyUtils.getOrCreateTopic;
    const origGetUserCredentials = PolicyUtils.getUserCredentials;
    const origSendMessage = MessageServer.prototype.sendMessage;

    let calls;
    let userCred;
    let ref;
    let user;

    beforeEach(() => {
        calls = {
            getOrCreateTopic: 0,
            getUserCredentials: 0,
            loadHederaCredentials: 0,
            loadRelayerAccount: 0,
            sendMessage: 0,
            generateDID: 0,
            saveSubDidDocument: 0,
        };
        userCred = {
            location: LocationType.LOCAL,
            loadHederaCredentials: async () => {
                calls.loadHederaCredentials++;
                return { hederaAccountId: '0.0.2', hederaAccountKey: 'op-key' };
            },
            loadRelayerAccount: async () => {
                calls.loadRelayerAccount++;
                return { hederaAccountId: '0.0.2', hederaAccountKey: 'op-key', signOptions: {} };
            },
            saveSubDidDocument: async () => {
                calls.saveSubDidDocument++;
            },
        };
        PolicyUtils.getOrCreateTopic = async () => {
            calls.getOrCreateTopic++;
            return { topicId: '0.0.111', submitKey: null };
        };
        PolicyUtils.getUserCredentials = async () => {
            calls.getUserCredentials++;
            return userCred;
        };
        MessageServer.prototype.sendMessage = async function () {
            calls.sendMessage++;
            return { getId: () => `msg-${calls.sendMessage}`, getTopicId: () => '0.0.111' };
        };
        let didSeq = 0;
        ref = {
            policyId: 'policy-1',
            tag: 'tag-1',
            dryRun: null,
            mockId: null,
            components: {
                generateDID: async () => {
                    calls.generateDID++;
                    const seq = ++didSeq;
                    return {
                        getDid: () => `did:hedera:testnet:device-${seq}`,
                        getDocument: () => ({ id: `did:hedera:testnet:device-${seq}` }),
                    };
                },
            },
        };
        user = makeUser({ did: 'did:owner', group: null });
    });

    afterEach(() => {
        PolicyUtils.getOrCreateTopic = origGetOrCreateTopic;
        PolicyUtils.getUserCredentials = origGetUserCredentials;
        MessageServer.prototype.sendMessage = origSendMessage;
    });

    const options = () => ({ ref, user, relayerAccount: null, userId: null });

    it('resolves topic, credentials and client once for a shared batch (sequential calls)', async () => {
        const batch = {};
        const dids = [];
        for (let i = 0; i < 3; i++) {
            dids.push(await GenerateDID.local(options(), undefined, batch));
        }
        assert.equal(new Set(dids).size, 3, 'every device gets a distinct DID');
        assert.equal(calls.getOrCreateTopic, 1);
        assert.equal(calls.getUserCredentials, 1);
        assert.equal(calls.loadHederaCredentials, 1);
        assert.equal(calls.loadRelayerAccount, 1);
        assert.equal(calls.generateDID, 3);
        assert.equal(calls.sendMessage, 3);
        assert.equal(calls.saveSubDidDocument, 3);
    });

    it('resolves the shared setup once under concurrent calls (no duplicate in-flight setup)', async () => {
        const batch = {};
        const dids = await Promise.all([
            GenerateDID.local(options(), undefined, batch),
            GenerateDID.local(options(), undefined, batch),
            GenerateDID.local(options(), undefined, batch),
            GenerateDID.local(options(), undefined, batch),
        ]);
        assert.equal(new Set(dids).size, 4);
        assert.equal(calls.getOrCreateTopic, 1);
        assert.equal(calls.getUserCredentials, 1);
        assert.equal(calls.loadHederaCredentials, 1);
        assert.equal(calls.loadRelayerAccount, 1);
        assert.equal(calls.sendMessage, 4);
    });

    it('keeps per-call setup when no batch is provided (back-compat)', async () => {
        await GenerateDID.local(options());
        await GenerateDID.local(options());
        assert.equal(calls.getOrCreateTopic, 2);
        assert.equal(calls.getUserCredentials, 2);
        assert.equal(calls.loadHederaCredentials, 2);
        assert.equal(calls.loadRelayerAccount, 2);
        assert.equal(calls.sendMessage, 2);
    });

    it('uses a pre-seeded batch context without re-resolving anything', async () => {
        const client = new MessageServer({
            operatorId: '0.0.2',
            operatorKey: 'op-key',
            encryptKey: 'op-key',
            signOptions: {},
            dryRun: null,
        });
        const batch = {
            topic: Promise.resolve({ topicId: '0.0.111', submitKey: null }),
            userCred: Promise.resolve(userCred),
            client: Promise.resolve(client),
        };
        const did = await GenerateDID.local(options(), undefined, batch);
        assert.match(did, /^did:hedera:testnet:device-/);
        assert.equal(calls.getOrCreateTopic, 0);
        assert.equal(calls.getUserCredentials, 0);
        assert.equal(calls.loadHederaCredentials, 0);
        assert.equal(calls.loadRelayerAccount, 0);
        assert.equal(calls.sendMessage, 1);
    });
});

describe('@unit PolicyActionsUtils.generateId batch threading (#6346)', () => {
    const origLocal = GenerateDID.local;
    const origGetUserCredentials = PolicyUtils.getUserCredentials;

    afterEach(() => {
        GenerateDID.local = origLocal;
        PolicyUtils.getUserCredentials = origGetUserCredentials;
    });

    it('passes the batch through to GenerateDID.local for DID ids', async () => {
        let receivedBatch;
        let receivedActionStatusId;
        GenerateDID.local = async (opts, actionStatusId, batch) => {
            receivedActionStatusId = actionStatusId;
            receivedBatch = batch;
            return 'did:hedera:testnet:generated';
        };
        PolicyUtils.getUserCredentials = async () => ({ location: LocationType.LOCAL });
        const batch = {};
        const ref = { policyId: 'policy-1', components: {}, error: () => {} };
        const id = await PolicyActionsUtils.generateId({
            ref,
            type: 'DID',
            user: makeUser(),
            relayerAccount: null,
            userId: null,
        }, 'action-1', batch);
        assert.equal(id, 'did:hedera:testnet:generated');
        assert.equal(receivedActionStatusId, 'action-1');
        assert.equal(receivedBatch, batch, 'the exact batch object reaches GenerateDID.local');
    });

    it('ignores the batch for UUID ids', async () => {
        let generateUUIDCalls = 0;
        const ref = {
            components: {
                generateUUID: async () => {
                    generateUUIDCalls++;
                    return 'uuid-1';
                },
            },
        };
        const id = await PolicyActionsUtils.generateId({
            ref,
            type: 'UUID',
            user: makeUser(),
            relayerAccount: null,
            userId: null,
        }, 'action-1', {});
        assert.equal(id, 'uuid-1');
        assert.equal(generateUUIDCalls, 1);
    });
});
