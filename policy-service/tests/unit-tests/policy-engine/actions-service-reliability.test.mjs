import { assert } from 'chai';
import esmock from 'esmock';
import { MessageAction } from '@guardian/hedera/message/message-action';
import { PolicyActionMessage } from '@guardian/hedera/message/policy-action-message';
import { LocationType, Permissions, PolicyActionStatus, PolicyActionType, PolicyStatus } from '@guardian/interfaces';

const SERVICE = '../../../dist/policy-engine/actions-service.js';
const ACTIONS_UTILS = '../../../dist/policy-engine/policy-actions/utils.js';
const POLICY_USER = '../../../dist/policy-engine/policy-user.js';
const HELPERS = '../../../dist/policy-engine/helpers/utils.js';
const COMPONENTS = '../../../dist/policy-engine/policy-components-utils.js';

/*
 * Remote policies: the main instance runs the policy, a user's home instance
 * holds their keys. Both sides talk over one actions topic. These tests run a
 * main and a home PolicyActionsService against a shared in-memory topic, each
 * with its own in-memory PolicyAction collection, and pass the messages one
 * side publishes to the other side's listener.
 */

const POLICY_OWNER = 'did:owner';
const OWNER_ACCOUNT = '0.0.100';
const USER_DID = 'did:user';
const USER_ACCOUNT = '0.0.200';
const OTHER_ACCOUNT = '0.0.999';
const TOPIC_ID = '0.0.1';
const POLICY_MESSAGE_ID = 'policy-message';

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves to 'pending' if the promise has not settled within ms
 */
async function state(promise, ms = 50) {
    return await Promise.race([
        promise.then((value) => ({ resolved: value }), (error) => ({ rejected: error })),
        tick(ms).then(() => 'pending')
    ]);
}

function matches(row, filter) {
    for (const [key, expected] of Object.entries(filter)) {
        const value = row[key];
        if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
            if ('$in' in expected && !expected.$in.includes(value)) {
                return false;
            }
            if ('$lt' in expected && !(value < expected.$lt)) {
                return false;
            }
        } else if ((value ?? null) !== (expected ?? null)) {
            return false;
        }
    }
    return true;
}

function createTopic() {
    return { messages: [], documents: new Map(), seq: 0 };
}

/**
 * The listener's view of a message one side published
 */
function toTopicMessage(entry) {
    return {
        message: JSON.stringify(entry.message.toMessageObject()),
        owner: entry.payer,
        sequenceNumber: entry.index,
        consensusTimestamp: entry.id,
        topicId: TOPIC_ID
    };
}

async function createSide({
    topic,
    main,
    users = { [USER_DID]: { did: USER_DID, location: main ? LocationType.REMOTE : LocationType.LOCAL } },
    messageKey = 'user-message-key',
    usersError = null,
    notificationError = null,
    updateManyDelay = 0,
    actionsUtils = undefined,
} = {}) {
    const rows = [];
    const calls = {
        getUserCredentials: [],
        loadMessageKey: [],
        loadDocument: [],
        notifications: [],
        subscribed: null,
        updateManyDone: 0,
    };

    class DataBaseHelper {
        static orm = {
            em: {
                getCollection: () => ({
                    updateMany: async (filter, { $set }) => {
                        if (updateManyDelay) {
                            await tick(updateManyDelay);
                        }
                        for (const row of rows.filter((r) => matches(r, filter))) {
                            Object.assign(row, $set);
                        }
                        calls.updateManyDone++;
                    },
                    updateOne: async (filter, { $set }) => {
                        const row = rows.find((r) => matches(r, filter));
                        if (row) {
                            Object.assign(row, $set);
                        }
                    }
                })
            }
        };

        create(data) {
            return { createDate: new Date(), ...data };
        }

        async findOne(filter) {
            return rows.find((r) => matches(r, filter)) || null;
        }

        async find(filter) {
            return rows.filter((r) => matches(r, filter));
        }

        async insertOrUpdate(entities, key) {
            for (const entity of entities) {
                const existing = rows.find((r) => r[key] === entity[key]);
                if (!existing) {
                    rows.push(entity);
                } else if (existing !== entity) {
                    Object.assign(existing, entity);
                }
            }
            return entities;
        }
    }

    class MessageServer {
        constructor(options) {
            this.options = options;
        }

        setTopicObject() {
            return this;
        }

        async sendMessage(message) {
            const index = ++topic.seq;
            const entry = { message, payer: this.options.operatorId, index, id: `ts-${index}` };
            topic.messages.push(entry);
            topic.documents.set(entry.id, message.document);
            return { getId: () => entry.id, payer: entry.payer };
        }

        static async loadDocument(message, key) {
            calls.loadDocument.push(message.id);
            if (!key) {
                throw new Error('Invalid key');
            }
            message.document = topic.documents.get(message.id);
            return message;
        }
    }

    class Users {
        async getUserById(did) {
            if (usersError) {
                throw usersError;
            }
            return users[did] || null;
        }
    }

    class TopicListener {
        setListenerName() {
            return this;
        }

        async subscribe(callback) {
            calls.subscribed = rows.map((r) => ({ messageId: r.messageId, status: r.status }));
            this.callback = callback;
            return this;
        }

        async close() {
            return this;
        }
    }

    const credentials = (did) => {
        const hederaAccountId = did === POLICY_OWNER ? OWNER_ACCOUNT : USER_ACCOUNT;
        return {
            hederaAccountId,
            loadHederaCredentials: async () => ({ hederaAccountId, hederaAccountKey: 'hedera-key' }),
            loadSignOptions: async () => ({}),
            loadMessageKey: async () => messageKey,
        };
    };

    const policyUser = {
        did: USER_DID,
        userId: 'user-id',
        hederaAccountId: USER_ACCOUNT,
        permissions: [Permissions.ACCESS_POLICY_ALL]
    };

    const mocks = {
        '@guardian/common/helpers/db-helper': { DataBaseHelper },
        '@guardian/common/database-modules/database-server': {
            DatabaseServer: { getTopicById: async () => ({ topicId: TOPIC_ID }) },
        },
        '@guardian/hedera/message/message-server': { MessageServer },
        '@guardian/hedera/topic': { TopicConfig: { fromObject: async () => ({ topicId: TOPIC_ID }) } },
        '@guardian/common/topic-listener/topic-listener': { TopicListener },
        '@guardian/common/helpers/users': { Users },
        [POLICY_USER]: {
            UserCredentials: {
                loadMessageKey: async (...args) => {
                    calls.loadMessageKey.push(args);
                    return messageKey;
                }
            }
        },
        [HELPERS]: {
            PolicyUtils: {
                getUserCredentials: async (ref, did) => {
                    calls.getUserCredentials.push(did);
                    return credentials(did);
                }
            }
        },
        [COMPONENTS]: {
            PolicyComponentsUtils: {
                sentRequestNotification: async (row) => {
                    calls.notifications.push(row);
                    if (notificationError) {
                        throw notificationError;
                    }
                },
                GetPolicyUserByDID: async (did) => (did === USER_DID ? policyUser : null),
            }
        },
    };
    if (actionsUtils) {
        mocks[ACTIONS_UTILS] = { PolicyActionsUtils: actionsUtils };
    }
    const module = await esmock(SERVICE, mocks);

    const service = new module.PolicyActionsService(
        'policy-1',
        {},
        {
            owner: POLICY_OWNER,
            status: main ? PolicyStatus.PUBLISH : PolicyStatus.VIEW,
            actionsTopicId: TOPIC_ID,
            messageId: POLICY_MESSAGE_ID
        },
        'owner-id'
    );
    // what the topic listener hands to the service
    service.receive = (entry) => service.loadTask(toTopicMessage(entry));
    return { service, rows, calls, policyUser, module };
}

/**
 * A request the main instance sends to the user's home instance
 */
function requestData() {
    return {
        uuid: 'request-uuid',
        owner: USER_DID,
        accountId: USER_ACCOUNT,
        relayerAccount: null,
        blockTag: 'sign-block',
        topicId: TOPIC_ID,
        document: { type: 'sign-vc', payload: 1 }
    };
}

/**
 * The step on the main instance waiting on a request: the callback settles it
 * the way PolicyActionsUtils does
 */
function waitRequest(main) {
    return new Promise((resolve, reject) => {
        const callback = async (action) => {
            if (action.status === PolicyActionStatus.COMPLETED) {
                resolve(action.document);
            } else {
                reject(action.document);
            }
        };
        main.sendRequest(requestData(), callback, 'owner-id').catch(reject);
    });
}

/**
 * A request on its way from the main instance to the home instance
 */
async function sendRequestToHome(topic, main, home) {
    const step = waitRequest(main.service);
    step.catch(() => null);
    await tick();
    const create = topic.messages.at(-1);
    await main.service.receive(create);
    await home.service.receive(create);
    return { step, create };
}

function pendingRow(overrides) {
    return {
        uuid: 'uuid',
        owner: USER_DID,
        creator: USER_DID,
        accountId: USER_ACCOUNT,
        topicId: TOPIC_ID,
        policyId: 'policy-1',
        policyMessageId: POLICY_MESSAGE_ID,
        status: PolicyActionStatus.NEW,
        lastStatus: PolicyActionStatus.NEW,
        loaded: true,
        createDate: new Date(),
        ...overrides,
        startMessageId: overrides.startMessageId || overrides.messageId,
    };
}

describe('@unit PolicyActionsService – rejecting a request', function () {
    this.timeout(60000);

    it('publishes the rejection on the actions topic', async () => {
        const topic = createTopic();
        const main = await createSide({ topic, main: true });
        const home = await createSide({ topic, main: false });
        const { create } = await sendRequestToHome(topic, main, home);

        await home.service.rejectRequest(create.id, home.policyUser);

        const reply = topic.messages.at(-1);
        assert.notStrictEqual(reply, create, 'the rejection must be sent, not only saved locally');
        assert.equal(reply.message.action, MessageAction.ErrorPolicyRequest);
        assert.equal(reply.message.parent, create.id);
        assert.equal(reply.payer, USER_ACCOUNT);

        const thread = home.rows.filter((r) => r.startMessageId === create.id);
        assert.includeMembers(thread.map((r) => r.status), [PolicyActionStatus.REJECTED]);
        assert.isTrue(thread.every((r) => r.lastStatus === PolicyActionStatus.REJECTED));
    });

    it('fails the step waiting on the main instance instead of hanging', async () => {
        const topic = createTopic();
        const main = await createSide({ topic, main: true });
        const home = await createSide({ topic, main: false });
        const { step, create } = await sendRequestToHome(topic, main, home);

        await home.service.rejectRequest(create.id, home.policyUser);
        await main.service.receive(topic.messages.at(-1));

        const result = await state(step);
        assert.deepEqual(result, { rejected: 'The request was rejected by the user' });
        assert.isFalse(main.service.callback.has(create.id), 'the callback is dropped once settled');
    });

    it('keeps the rejection when its own echo comes back', async () => {
        const topic = createTopic();
        const main = await createSide({ topic, main: true });
        const home = await createSide({ topic, main: false });
        const { create } = await sendRequestToHome(topic, main, home);

        await home.service.rejectRequest(create.id, home.policyUser);
        await home.service.receive(topic.messages.at(-1));

        const thread = home.rows.filter((r) => r.startMessageId === create.id);
        assert.includeMembers(thread.map((r) => r.status), [PolicyActionStatus.REJECTED]);
        assert.notInclude(thread.map((r) => r.status), PolicyActionStatus.ERROR);
        assert.isTrue(thread.every((r) => r.lastStatus === PolicyActionStatus.REJECTED));
    });

    it('ignores an error response the user did not pay for', async () => {
        const topic = createTopic();
        const main = await createSide({ topic, main: true });
        const home = await createSide({ topic, main: false });
        const { step, create } = await sendRequestToHome(topic, main, home);

        await home.service.rejectRequest(create.id, home.policyUser);
        await main.service.receive({ ...topic.messages.at(-1), payer: OTHER_ACCOUNT });

        assert.equal(await state(step), 'pending');
        assert.isTrue(main.service.callback.has(create.id));
    });

    it('fails the step when completing a response throws', async () => {
        let callback;
        const { PolicyActionsUtils } = await esmock(ACTIONS_UTILS, {
            [COMPONENTS]: {
                PolicyComponentsUtils: {
                    getActionsController: () => ({
                        sendRequest: async (data, cb) => { callback = cb; }
                    })
                }
            }
        });
        const step = PolicyActionsUtils.waitRequest({ policyId: 'policy-1' }, requestData(), null,
            async () => { throw new Error('Invalid signature'); });
        await tick();
        await callback({ status: PolicyActionStatus.COMPLETED, document: {} });

        const result = await state(step);
        assert.instanceOf(result.rejected, Error);
        assert.equal(result.rejected.message, 'Invalid signature');
    });
});

describe('@unit PolicyActionsService – restart', function () {
    this.timeout(60000);

    async function restartedMain() {
        const topic = createTopic();
        const main = await createSide({ topic, main: true });
        main.rows.push(
            // sent by this instance, waiting on the user
            pendingRow({ messageId: 'request-1', type: PolicyActionType.REQUEST, sender: OWNER_ACCOUNT, document: { type: 'sign-vc' } }),
            // posted on the topic by somebody else
            pendingRow({ messageId: 'request-2', type: PolicyActionType.REQUEST, sender: OTHER_ACCOUNT, document: { type: 'sign-vc' } }),
            // an incoming action whose execution was cut short
            pendingRow({ messageId: 'action-1', type: PolicyActionType.ACTION, sender: USER_ACCOUNT, blockTag: 'block', document: {} }),
            // finished before the restart
            pendingRow({ messageId: 'action-2', type: PolicyActionType.ACTION, sender: USER_ACCOUNT, lastStatus: PolicyActionStatus.COMPLETED }),
        );
        await main.service.init();
        await tick(20);
        return { topic, main };
    }

    it('fails requests and actions whose continuation was lost, before listening', async () => {
        const { main } = await restartedMain();

        const status = (messageId) => main.rows.find((r) => r.messageId === messageId);
        assert.equal(status('request-1').status, PolicyActionStatus.ERROR);
        assert.equal(status('request-1').lastStatus, PolicyActionStatus.ERROR);
        assert.equal(status('request-2').status, PolicyActionStatus.ERROR);
        assert.equal(status('action-1').status, PolicyActionStatus.ERROR);
        assert.equal(status('action-2').status, PolicyActionStatus.NEW, 'a finished action is left alone');
        assert.equal(status('action-2').lastStatus, PolicyActionStatus.COMPLETED);

        const atSubscribe = Object.fromEntries(main.calls.subscribed.map((r) => [r.messageId, r.status]));
        assert.equal(atSubscribe['request-1'], PolicyActionStatus.ERROR, 'marked before the listener starts');
        assert.equal(atSubscribe['action-1'], PolicyActionStatus.ERROR);
    });

    it('tells the home instance, but only about what this instance sent', async () => {
        const { topic } = await restartedMain();

        const sent = topic.messages.map((e) => ({ action: e.message.action, parent: e.message.parent, payer: e.payer }));
        assert.deepInclude(sent, { action: MessageAction.ErrorPolicyRequest, parent: 'request-1', payer: OWNER_ACCOUNT });
        assert.deepInclude(sent, { action: MessageAction.ErrorPolicyAction, parent: 'action-1', payer: OWNER_ACCOUNT });
        assert.notDeepInclude(sent.map((e) => e.parent), 'request-2');
        const error = topic.messages.find((e) => e.message.parent === 'request-1');
        assert.match(error.message.document, /restart – please try again/);
    });

    it('does not run a replayed action again', async () => {
        const { main } = await restartedMain();
        let executed = 0;
        main.service.executeAction = async () => { executed++; };

        const message = new PolicyActionMessage(MessageAction.CreatePolicyAction);
        message.setDocument(main.rows.find((r) => r.messageId === 'action-1'), {});
        await main.service.receive({ message, payer: USER_ACCOUNT, index: 1, id: 'action-1' });
        await tick(10);

        assert.equal(executed, 0);
        assert.equal(main.rows.find((r) => r.messageId === 'action-1').status, PolicyActionStatus.ERROR);
    });

    it('leaves the home side alone: a late response still updates its rows', async () => {
        const topic = createTopic();
        const home = await createSide({ topic, main: false });
        home.rows.push(pendingRow({ messageId: 'action-1', type: PolicyActionType.ACTION, sender: USER_ACCOUNT }));
        await home.service.init();
        await tick(20);

        assert.equal(home.rows[0].status, PolicyActionStatus.NEW);
        assert.lengthOf(topic.messages, 0);
    });
});

describe('@unit PolicyActionsService – expiry', function () {
    this.timeout(60000);

    const DAY = 24 * 60 * 60 * 1000;
    let saved;
    beforeEach(() => { saved = process.env.REMOTE_ACTIONS_EXPIRATION_DAYS; });
    afterEach(() => {
        if (saved === undefined) {
            delete process.env.REMOTE_ACTIONS_EXPIRATION_DAYS;
        } else {
            process.env.REMOTE_ACTIONS_EXPIRATION_DAYS = saved;
        }
    });

    it('reads the expiry from REMOTE_ACTIONS_EXPIRATION_DAYS', async () => {
        const { module } = await createSide({ topic: createTopic(), main: true });
        const { PolicyActionsService } = module;
        delete process.env.REMOTE_ACTIONS_EXPIRATION_DAYS;
        assert.equal(PolicyActionsService.getExpiration(), 7 * DAY, 'default 7 days');
        process.env.REMOTE_ACTIONS_EXPIRATION_DAYS = '0';
        assert.equal(PolicyActionsService.getExpiration(), 0, '0 - never');
        process.env.REMOTE_ACTIONS_EXPIRATION_DAYS = '1.5';
        assert.equal(PolicyActionsService.getExpiration(), 1.5 * DAY);
        process.env.REMOTE_ACTIONS_EXPIRATION_DAYS = 'soon';
        assert.equal(PolicyActionsService.getExpiration(), 7 * DAY, 'garbage falls back to the default');
    });

    it('fails an old request on the main instance and tells the home instance', async () => {
        const topic = createTopic();
        const main = await createSide({ topic, main: true });
        const home = await createSide({ topic, main: false });
        const { step, create } = await sendRequestToHome(topic, main, home);
        main.rows.find((r) => r.messageId === create.id).createDate = new Date(Date.now() - 8 * DAY);

        await main.service.expirePending();

        assert.deepEqual(await state(step), { rejected: 'The request expired without a response' });
        assert.isFalse(main.service.callback.has(create.id));
        assert.equal(main.rows.find((r) => r.messageId === create.id).status, PolicyActionStatus.ERROR);

        const error = topic.messages.at(-1);
        assert.equal(error.message.action, MessageAction.ErrorPolicyRequest);
        assert.equal(error.message.parent, create.id);

        await home.service.receive(error);
        const thread = home.rows.filter((r) => r.startMessageId === create.id);
        assert.include(thread.map((r) => r.status), PolicyActionStatus.ERROR, 'the home row stops showing New');
        assert.isTrue(thread.every((r) => r.lastStatus === PolicyActionStatus.ERROR));
    });

    it('fails an old action on the home instance', async () => {
        const topic = createTopic();
        const home = await createSide({ topic, main: false });
        const call = home.service.sendAction({ tag: 'block' }, home.policyUser, { value: 1 });
        call.catch(() => null);
        await tick();
        const action = topic.messages.at(-1);
        home.rows.find((r) => r.messageId === action.id).createDate = new Date(Date.now() - 8 * DAY);

        await home.service.expirePending();

        assert.deepEqual(await state(call), { rejected: 'The request expired without a response' });
        assert.isFalse(home.service.actions.has(action.id));
        assert.equal(home.rows.find((r) => r.messageId === action.id).lastStatus, PolicyActionStatus.ERROR);
        assert.lengthOf(topic.messages, 1, 'nothing is sent from the home side');
    });

    it('leaves recent rows, and everything when set to 0', async () => {
        const topic = createTopic();
        const home = await createSide({ topic, main: false });
        home.rows.push(pendingRow({ messageId: 'recent', type: PolicyActionType.ACTION }));
        await home.service.expirePending();
        assert.equal(home.rows[0].status, PolicyActionStatus.NEW);

        process.env.REMOTE_ACTIONS_EXPIRATION_DAYS = '0';
        const never = await createSide({ topic, main: false });
        never.rows.push(pendingRow({ messageId: 'old', type: PolicyActionType.ACTION, createDate: new Date(0) }));
        await never.service.expirePending();
        assert.equal(never.rows[0].status, PolicyActionStatus.NEW);
    });
});

describe('@unit PolicyActionsService – waitRemotePolicy timeout', function () {
    this.timeout(60000);

    it('stops waiting at the deadline and returns true', async () => {
        const topic = createTopic();
        const home = await createSide({ topic, main: false });
        const started = Date.now();
        const result = await state(home.service.sendAction({ tag: 'block' }, home.policyUser, {}, true, Date.now() + 30), 1000);

        assert.deepEqual(result, { resolved: true });
        assert.isBelow(Date.now() - started, 500);
        assert.equal(home.service.actions.size, 0, 'nothing is left waiting');
    });

    it('still returns the response if it comes in time', async () => {
        const topic = createTopic();
        const home = await createSide({ topic, main: false });
        const call = home.service.sendAction({ tag: 'block' }, home.policyUser, {}, true, Date.now() + 5000);
        await tick();
        const action = topic.messages.at(-1);

        // the main instance's reply
        const reply = new PolicyActionMessage(MessageAction.UpdatePolicyAction);
        reply.setDocument({ ...home.rows[0], startMessageId: action.id }, { result: 'done' });
        topic.documents.set('reply-1', { result: 'done' });
        await home.service.receive({ message: reply, payer: OWNER_ACCOUNT, index: 2, id: 'reply-1' });

        assert.deepEqual(await state(call, 100), { resolved: { result: 'done' } });
    });

    it('waits as before without a deadline', async () => {
        const topic = createTopic();
        const home = await createSide({ topic, main: false });
        const call = home.service.sendAction({ tag: 'block' }, home.policyUser, {}, true);

        assert.equal(await state(call, 80), 'pending');
    });
});

describe('@unit PolicyActionsService – the listener is not held up by execution', function () {
    this.timeout(60000);

    async function mainWithGate() {
        const topic = createTopic();
        const main = await createSide({ topic, main: true });
        const started = [];
        const gates = new Map();
        main.service.executeAction = (row) => {
            started.push(row.messageId);
            return new Promise((resolve) => gates.set(row.messageId, resolve));
        };
        let index = 0;
        const send = async (owner) => {
            const message = new PolicyActionMessage(MessageAction.CreatePolicyAction);
            const id = `action-${++index}`;
            message.setDocument(pendingRow({ messageId: id, owner, type: PolicyActionType.ACTION }), {});
            message.parent = undefined;
            return { id, done: main.service.receive({ message, payer: USER_ACCOUNT, index, id }) };
        };
        return { main, started, gates, send };
    }

    it('returns to the listener before the action has run', async () => {
        const { started, send } = await mainWithGate();
        const { done } = await send(USER_DID);

        assert.deepEqual(await state(done), { resolved: true });
        await tick();
        assert.deepEqual(started, ['action-1']);
    });

    it('runs actions of one owner in order, other owners alongside', async () => {
        const { started, gates, send } = await mainWithGate();
        await (await send(USER_DID)).done;
        await (await send(USER_DID)).done;
        await (await send('did:other')).done;
        await tick();

        assert.deepEqual(started, ['action-1', 'action-3'], 'the second action of the owner waits');
        gates.get('action-1')();
        await tick();
        assert.deepEqual(started, ['action-1', 'action-3', 'action-2']);
    });
});

describe('@unit PolicyActionsService – messages of other users', function () {
    this.timeout(60000);

    function createMessage(owner) {
        const message = new PolicyActionMessage(MessageAction.CreatePolicyRequest);
        message.setDocument(pendingRow({ messageId: 'request-1', owner, type: PolicyActionType.REQUEST }), { type: 'sign-vc' });
        message.parent = undefined;
        return message;
    }

    it('does not fetch or decrypt a message for an unknown owner', async () => {
        const topic = createTopic();
        const home = await createSide({ topic, main: false });
        await home.service.receive({ message: createMessage('did:stranger'), payer: OWNER_ACCOUNT, index: 1, id: 'request-1' });

        assert.lengthOf(home.calls.loadMessageKey, 0);
        assert.lengthOf(home.calls.loadDocument, 0);
        assert.isFalse(home.rows[0].loaded);
        assert.isNull(home.rows[0].document);
    });

    it('skips a user registered here as remote on the home side', async () => {
        const topic = createTopic();
        const home = await createSide({
            topic,
            main: false,
            users: { [USER_DID]: { did: USER_DID, location: LocationType.REMOTE } }
        });
        await home.service.receive({ message: createMessage(USER_DID), payer: OWNER_ACCOUNT, index: 1, id: 'request-1' });

        assert.lengthOf(home.calls.loadDocument, 0);
    });

    it('decrypts for a local user on the home side and a registered user on the main side', async () => {
        const topic = createTopic();
        topic.documents.set('request-1', { type: 'sign-vc' });
        const home = await createSide({ topic, main: false });
        const main = await createSide({ topic, main: true });
        await home.service.receive({ message: createMessage(USER_DID), payer: OWNER_ACCOUNT, index: 1, id: 'request-1' });
        await main.service.receive({ message: createMessage(USER_DID), payer: OWNER_ACCOUNT, index: 1, id: 'request-1' });

        assert.isTrue(home.rows[0].loaded);
        assert.deepEqual(home.rows[0].document, { type: 'sign-vc' });
        assert.isTrue(main.rows[0].loaded);
    });

    it('still tries the key when the user lookup fails', async () => {
        const topic = createTopic();
        topic.documents.set('request-1', { type: 'sign-vc' });
        const home = await createSide({ topic, main: false, usersError: new Error('auth-service is down') });
        await home.service.receive({ message: createMessage('did:stranger'), payer: OWNER_ACCOUNT, index: 1, id: 'request-1' });

        assert.lengthOf(home.calls.loadDocument, 1);
        assert.isTrue(home.rows[0].loaded);
    });

    it('can still be loaded later once the key is there', async () => {
        const topic = createTopic();
        const home = await createSide({ topic, main: false, messageKey: null });
        await home.service.receive({ message: createMessage(USER_DID), payer: OWNER_ACCOUNT, index: 1, id: 'request-1' });

        assert.isFalse(home.rows[0].loaded, 'a local user without a key yet gets a row to reload');
        assert.equal(home.rows[0].accountId, USER_ACCOUNT);
    });

    it('keeps the document it wrote when its own echo cannot be read', async () => {
        const topic = createTopic();
        const main = await createSide({ topic, main: true, users: {} });
        const step = waitRequest(main.service);
        step.catch(() => null);
        await tick();
        await main.service.receive(topic.messages.at(-1));

        assert.isTrue(main.rows[0].loaded);
        assert.deepEqual(main.rows[0].document, requestData().document);
    });
});

describe('@unit PolicyActionsService – small fixes', function () {
    this.timeout(60000);

    it('looks the user credentials up once when answering a request', async () => {
        const topic = createTopic();
        const home = await createSide({
            topic,
            main: false,
            actionsUtils: { response: async () => ({ signed: true }) }
        });
        home.rows.push(pendingRow({ messageId: 'request-1', type: PolicyActionType.REQUEST, document: { type: 'sign-vc' } }));

        await home.service.sendResponse('request-1', home.policyUser);

        assert.deepEqual(home.calls.getUserCredentials, [USER_DID]);
    });

    it('waits for the thread status update', async () => {
        const topic = createTopic();
        const main = await createSide({ topic, main: true });
        const home = await createSide({ topic, main: false, updateManyDelay: 20 });
        const { create } = await sendRequestToHome(topic, main, home);
        const before = home.calls.updateManyDone;

        await home.service.rejectRequest(create.id, home.policyUser);

        assert.isAbove(home.calls.updateManyDone, before);
    });

    it('logs a failed notification instead of leaving it unhandled', async () => {
        const topic = createTopic();
        const failure = new Error('notification failed');
        const home = await createSide({ topic, main: false, notificationError: failure });
        const logged = [];
        const unhandled = [];
        const onUnhandled = (error) => unhandled.push(error);
        const consoleError = console.error;
        console.error = (...args) => logged.push(args[0]);
        process.on('unhandledRejection', onUnhandled);
        try {
            await home.service.sendAction({ tag: 'block' }, home.policyUser, {}, false);
            await tick(10);
        } finally {
            console.error = consoleError;
            process.off('unhandledRejection', onUnhandled);
        }

        assert.include(logged, failure);
        assert.lengthOf(unhandled, 0);
    });
});
