import { assert } from 'chai';
import esmock from 'esmock';

const channelCtorCalls = [];
let uuidCounter = 0;

const { PolicyServiceChannelsContainer } = await esmock('../../dist/helpers/policy-service-channels-container.js', {
    '@guardian/common': {
        MessageBrokerChannel: class FakeChannel {
            constructor(cn, name) {
                this.cn = cn;
                this.name = name;
                channelCtorCalls.push({ cn, name });
            }
            subscribe() { return { unsubscribe: () => {} }; }
            publish() {}
        },
        Singleton: (target) => target,
    },
    '@guardian/interfaces': {
        GenerateUUIDv4: () => `uuid-${++uuidCounter}`,
    },
});

beforeEach(() => { channelCtorCalls.length = 0; });

describe('@unit PolicyServiceChannelsContainer', () => {
    // The exported class uses a per-instance Map but each static method calls
    // `new PolicyServiceChannelsContainer()`. That means every static call
    // creates a fresh container — `get` after `create` will not see the entry.
    // This test pins down the actual behaviour, including its quirks.

    it('createPolicyServiceChannel returns an entity with name and channel', () => {
        const entity = PolicyServiceChannelsContainer.createPolicyServiceChannel('p-1');
        assert.equal(typeof entity.name, 'string');
        assert.match(entity.name, /^policy-p-1-uuid-/);
        assert.ok(entity.channel);
    });

    it('channel name embeds the policyId so logs/traces remain identifiable', () => {
        const entity = PolicyServiceChannelsContainer.createPolicyServiceChannel('policy-XYZ');
        assert.match(entity.name, /policy-XYZ/);
    });

    it('createPolicyServiceChannel constructs exactly one MessageBrokerChannel per call', () => {
        PolicyServiceChannelsContainer.createPolicyServiceChannel('p-2');
        assert.equal(channelCtorCalls.length, 1);
    });

    it('static getPolicyServiceChannel returns null for an unknown id (fresh instance per call)', () => {
        // Documents the quirk: each static accessor instantiates a new
        // container, so cross-call lookup ALWAYS returns null. If this changes,
        // the static API contract has changed.
        assert.equal(PolicyServiceChannelsContainer.getPolicyServiceChannel('never-created'), null);
    });

    it('createIfNotExistServiceChannel always creates because get returns null per call', () => {
        const before = channelCtorCalls.length;
        PolicyServiceChannelsContainer.createIfNotExistServiceChannel('p-3');
        const after = channelCtorCalls.length;
        // Per the static-method behaviour, this WILL create a new channel each time.
        assert.equal(after - before, 1);
    });

    it('deletePolicyServiceChannel does not throw on an unknown policyId', () => {
        assert.doesNotThrow(() => PolicyServiceChannelsContainer.deletePolicyServiceChannel('never-created'));
    });

    describe('instance-level (Map persistence within a single container)', () => {
        let container;
        beforeEach(() => {
            container = new PolicyServiceChannelsContainer();
            container.setConnection({ id: 'fake-conn' });
        });

        it('private getPolicyServiceChannel via reflection: get-after-create-on-same-instance returns the same entity', () => {
            // The private methods are accessible via the same instance.
            const created = container['createPolicyServiceChannel']('p-A');
            const got = container['getPolicyServiceChannel']('p-A');
            assert.strictEqual(got, created);
        });

        it('delete removes the entry from the same-instance Map', () => {
            container['createPolicyServiceChannel']('p-B');
            container['deletePolicyServiceChannel']('p-B');
            assert.equal(container['getPolicyServiceChannel']('p-B'), null);
        });

        it('two policies on the same instance get distinct channels', () => {
            const a = container['createPolicyServiceChannel']('p-X');
            const b = container['createPolicyServiceChannel']('p-Y');
            assert.notStrictEqual(a, b);
            assert.notEqual(a.name, b.name);
        });

        it('setConnection passes connection through to subsequent channel constructions', () => {
            container.setConnection({ id: 'conn-1' });
            container['createPolicyServiceChannel']('p-conn');
            const last = channelCtorCalls[channelCtorCalls.length - 1];
            assert.deepEqual(last.cn, { id: 'conn-1' });
        });
    });
});
