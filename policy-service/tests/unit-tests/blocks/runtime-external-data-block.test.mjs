import { assert } from 'chai';
import { ExternalDataBlock } from '../../../dist/policy-engine/blocks/external-data-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origCache = PolicyComponentsUtils.getDocumentCacheFields;

const mk = () => Object.create(ExternalDataBlock.prototype);

function makeRef(overrides = {}) {
    const calls = { errors: [] };
    const ref = {
        uuid: 'ext-uuid',
        blockType: 'externalDataBlock',
        policyId: 'p1',
        options: {},
        children: [],
        error(m) { calls.errors.push(m); },
        ...overrides,
    };
    return { ref, calls };
}

function withRef(ref, fn) {
    PolicyComponentsUtils.GetBlockRef = () => ref;
    return fn();
}

after(() => {
    PolicyComponentsUtils.GetBlockRef = origGetRef;
    PolicyComponentsUtils.getDocumentCacheFields = origCache;
});

describe('ExternalDataBlock runtime — getValidators', () => {
    it('returns only ValidatorBlock children', () => {
        const block = mk();
        const { ref } = makeRef({
            children: [
                { blockClassName: 'ValidatorBlock', id: 'v1' },
                { blockClassName: 'OtherBlock', id: 'o1' },
                { blockClassName: 'ValidatorBlock', id: 'v2' },
            ],
        });
        const validators = withRef(ref, () => block.getValidators());
        assert.deepEqual(validators.map(v => v.id), ['v1', 'v2']);
    });

    it('returns an empty list when there are no validators', () => {
        const block = mk();
        const { ref } = makeRef({ children: [{ blockClassName: 'X' }] });
        assert.deepEqual(withRef(ref, () => block.getValidators()), []);
    });
});

describe('ExternalDataBlock runtime — validateDocuments', () => {
    it('returns null when every validator passes', async () => {
        const block = mk();
        const { ref } = makeRef({
            children: [
                { blockClassName: 'ValidatorBlock', async run() { return null; } },
                { blockClassName: 'ValidatorBlock', async run() { return null; } },
            ],
        });
        const out = await withRef(ref, () => block.validateDocuments({ id: 'u' }, { data: {} }));
        assert.isNull(out);
    });

    it('returns the first validator error encountered', async () => {
        const block = mk();
        const { ref } = makeRef({
            children: [
                { blockClassName: 'ValidatorBlock', async run() { return null; } },
                { blockClassName: 'ValidatorBlock', async run() { return 'bad doc'; } },
                { blockClassName: 'ValidatorBlock', async run() { return 'never reached'; } },
            ],
        });
        const out = await withRef(ref, () => block.validateDocuments({ id: 'u' }, { data: {} }));
        assert.equal(out, 'bad doc');
    });

    it('passes the policy user and state into each validator', async () => {
        const block = mk();
        let captured;
        const { ref } = makeRef({
            children: [{ blockClassName: 'ValidatorBlock', async run(e) { captured = e; return null; } }],
        });
        await withRef(ref, () => block.validateDocuments({ id: 'u9' }, { data: { x: 1 } }));
        assert.equal(captured.user.id, 'u9');
        assert.deepEqual(captured.data, { data: { x: 1 } });
    });
});

describe('ExternalDataBlock runtime — getSchema', () => {
    it('returns null when no schema option is configured', async () => {
        const block = mk();
        const { ref } = makeRef({ options: {} });
        const out = await withRef(ref, () => block.getSchema());
        assert.isNull(out);
    });

    it('returns a cached schema instance without reloading', async () => {
        const block = mk();
        block.schema = { cached: true };
        const { ref } = makeRef({ options: { schema: '#Foo' } });
        const out = await withRef(ref, () => block.getSchema());
        assert.deepEqual(out, { cached: true });
    });
});

describe('ExternalDataBlock runtime — getRelationships error path', () => {
    it('wraps load failures in a BlockActionError and logs', async () => {
        const block = mk();
        const { ref, calls } = makeRef();
        let threw = null;
        try {
            await withRef(ref, () => block.getRelationships(ref, 'ref-id'));
        } catch (e) { threw = e; }
        assert.isNotNull(threw);
        assert.match(threw.message, /Invalid relationships/);
        assert.isAbove(calls.errors.length, 0);
    });
});

describe('ExternalDataBlock runtime — beforeInit', () => {
    it('registers credentialSubject.0.id into the document cache', async () => {
        const block = mk();
        const cache = new Set();
        PolicyComponentsUtils.getDocumentCacheFields = () => cache;
        const { ref } = makeRef();
        await withRef(ref, () => block.beforeInit());
        assert.isTrue(cache.has('credentialSubject.0.id'));
    });
});
