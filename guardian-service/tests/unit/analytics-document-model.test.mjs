import assert from 'node:assert/strict';
import { VcDocumentModel, VpDocumentModel } from '../../dist/analytics/compare/models/document.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All', childLvl: 'All' };

const vcRaw = (overrides = {}) => ({
    id: 'doc-1',
    schema: 'schema-A',
    messageId: 'm-1',
    topicId: '0.0.1',
    owner: 'did:owner',
    policyId: 'p-1',
    document: { '@context': ['https://x'], type: 'VerifiableCredential', credentialSubject: { type: 'Sub', amount: 5 } },
    option: { tag: 'submit' },
    relationships: [],
    ...overrides,
});

const vpRaw = (overrides = {}) => ({
    id: 'doc-vp',
    type: 'PolicyVP',
    messageId: 'm-2',
    topicId: '0.0.1',
    owner: 'did:owner',
    policyId: 'p-1',
    document: {
        '@context': ['https://x'],
        type: ['VerifiablePresentation'],
        verifiableCredential: [{ credentialSubject: { type: 'Sub' } }],
    },
    option: {},
    relationships: ['vc-1', 'vc-2'],
    ...overrides,
});

describe('VcDocumentModel', () => {
    it('captures id/messageId/topicId/owner/policy', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        assert.equal(m.id, 'doc-1');
        assert.equal(m.messageId, 'm-1');
        assert.equal(m.topicId, '0.0.1');
        assert.equal(m.owner, 'did:owner');
        assert.equal(m.policy, 'p-1');
    });

    it('uses schema as the key', () => {
        const m = new VcDocumentModel(vcRaw({ schema: 'iri:foo' }), opts);
        assert.equal(m.key, 'iri:foo');
    });

    it('captures relationship ids', () => {
        const m = new VcDocumentModel(vcRaw({ relationships: ['r-1', 'r-2'] }), opts);
        assert.deepEqual(m.relationshipIds, ['r-1', 'r-2']);
    });

    it('handles a missing relationships field as []', () => {
        const m = new VcDocumentModel(vcRaw({ relationships: undefined }), opts);
        assert.deepEqual(m.relationshipIds, []);
    });

    it('starts with empty weights and _hash', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        assert.deepEqual(m.getWeights(), []);
        assert.equal(m.maxWeight(), 0);
    });

    it('VcDocumentModel.from(data, options) builds with no schema/relationships', () => {
        const m = VcDocumentModel.from({ credentialSubject: { type: 'X' } }, opts);
        assert.equal(m.type, 'VC');
        assert.equal(m.key, null);
    });
});

describe('VpDocumentModel', () => {
    it('uses raw.type as the key', () => {
        const m = new VpDocumentModel(vpRaw(), opts);
        assert.equal(m.key, 'PolicyVP');
    });

    it('captures relationship ids from the raw input', () => {
        const m = new VpDocumentModel(vpRaw({ relationships: ['a', 'b'] }), opts);
        assert.deepEqual(m.relationshipIds, ['a', 'b']);
    });

    it('VpDocumentModel.from(data, options) builds with type=VP and no key', () => {
        const m = VpDocumentModel.from({ verifiableCredential: [] }, opts);
        assert.equal(m.type, 'VP');
        assert.equal(m.key, null);
    });
});

describe('DocumentModel set* mutators', () => {
    it('returns the model for chaining', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        assert.equal(m.setSchemas([]), m);
        assert.equal(m.setRelationships([]), m);
        assert.equal(m.setAttributes({ foo: 'bar' }), m);
    });

    it('setRelationships(non-array) falls back to []', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        m.setRelationships(null);
        assert.deepEqual(m.children, []);
    });

    it('setAttributes is reflected by .attributes', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        m.setAttributes({ foo: 'bar' });
        assert.deepEqual(m.attributes, { foo: 'bar' });
    });
});

describe('DocumentModel.update + getWeights', () => {
    it('update() populates a non-empty weights array', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        m.setSchemas([]).setRelationships([]);
        m.update(opts);
        assert.ok(m.getWeights().length > 0);
        assert.ok(m.maxWeight() > 0);
    });

    it('update() returns the model for chaining', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        m.setSchemas([]).setRelationships([]);
        assert.equal(m.update(opts), m);
    });
});

describe('DocumentModel.equal', () => {
    it('returns false when types differ (VC vs VP)', () => {
        const a = new VcDocumentModel(vcRaw(), opts).setSchemas([]).setRelationships([]);
        const b = new VpDocumentModel(vpRaw(), opts).setSchemas([]).setRelationships([]);
        a.update(opts);
        b.update(opts);
        assert.equal(a.equal(b), false);
    });

    it('returns true for two identical VC docs (no schemas/relationships) before update', () => {
        const a = new VcDocumentModel(vcRaw(), opts);
        const b = new VcDocumentModel(vcRaw(), opts);
        // Both _hash are '' before update — equal returns true.
        assert.equal(a.equal(b), true);
    });
});

describe('DocumentModel.getSchemas / getTypes', () => {
    it('returns @context entries (minus credentials/v1) and credentialSubject types', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        const schemas = m.getSchemas();
        const types = m.getTypes();
        assert.deepEqual(schemas, ['https://x']);
        assert.deepEqual(types, ['Sub']);
    });
});

describe('DocumentModel.toObject / info', () => {
    it('toObject returns {key, owner, policy, attributes, document, options}', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        m.setAttributes({ foo: 1 });
        const o = m.toObject();
        assert.equal(o.key, 'schema-A');
        assert.equal(o.owner, 'did:owner');
        assert.equal(o.policy, 'p-1');
        assert.deepEqual(o.attributes, { foo: 1 });
        assert.ok(Array.isArray(o.document));
        assert.ok(Array.isArray(o.options));
    });

    it('info returns {id, type, owner, policy}', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        assert.deepEqual(m.info(), { id: 'doc-1', type: 'VC', owner: 'did:owner', policy: 'p-1' });
    });
});

describe('DocumentModel.title', () => {
    it('returns the key when no schemas are attached', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        m.setSchemas([]);
        assert.equal(m.title(), 'schema-A');
    });

    it('joins schema description / name / iri (in that priority)', () => {
        const m = new VcDocumentModel(vcRaw(), opts);
        m.setSchemas([
            { description: 'Desc-A', name: 'name-A', iri: '#A' },
            { description: '', name: 'name-B', iri: '#B' },
            { description: '', name: '', iri: '#C' },
        ]);
        assert.equal(m.title(), 'Desc-A, name-B, #C');
    });
});
