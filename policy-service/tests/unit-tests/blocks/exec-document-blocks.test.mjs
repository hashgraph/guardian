import assert from 'node:assert/strict';
import { LocationType } from '@guardian/interfaces';
import { makeBlock, makeUser, makeDb, restoreHarness } from './_block-exec-harness.mjs';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/blocks/document-validator-block.js';
import { ExtractDataBlock } from '../../../dist/policy-engine/blocks/extract-data-block.js';
import { ReassigningBlock } from '../../../dist/policy-engine/blocks/reassigning.block.js';
import { MultiSignBlock } from '../../../dist/policy-engine/blocks/multi-sign-block.js';
import { AggregateBlock } from '../../../dist/policy-engine/blocks/aggregate-block.js';
import { SplitBlock } from '../../../dist/policy-engine/blocks/split-block.js';
import { SetRelationshipsBlock } from '../../../dist/policy-engine/blocks/set-relationships-block.js';
import { FiltersAddonBlock } from '../../../dist/policy-engine/blocks/filters-addon-block.js';

const _origExternal = PolicyComponentsUtils.ExternalEventFn;
const _origBlockUpdate = PolicyComponentsUtils.BlockUpdateFn;
let externalEvents = [];
let blockUpdates = [];

function instrument(block) {
    const captured = [];
    block.triggerEvents = async (...a) => { captured.push(a); };
    block.backup = () => {};
    return captured;
}

function vcDoc(overrides = {}) {
    return {
        id: 'vc-1',
        owner: 'did:owner',
        document: { credentialSubject: [{ type: 'X', field0: 'a' }] },
        ...overrides,
    };
}

before(() => {
    PolicyComponentsUtils.ExternalEventFn = (e) => { externalEvents.push(e); };
    PolicyComponentsUtils.BlockUpdateFn = (b, u) => { blockUpdates.push([b, u]); };
});

after(() => {
    PolicyComponentsUtils.ExternalEventFn = _origExternal;
    PolicyComponentsUtils.BlockUpdateFn = _origBlockUpdate;
    restoreHarness();
});

beforeEach(() => {
    // Reinstall the singleton overrides before every test: other suites in the
    // full run share PolicyComponentsUtils and restore these fns in their own
    // after() hooks, which would otherwise clobber our capture mid-suite.
    PolicyComponentsUtils.ExternalEventFn = (e) => { externalEvents.push(e); };
    PolicyComponentsUtils.BlockUpdateFn = (b, u) => { blockUpdates.push([b, u]); };
    externalEvents = [];
    blockUpdates = [];
});

describe('@unit document-validator-block runtime', () => {
    after(() => restoreHarness());

    const ev = (data, user = makeUser()) => ({ user, data: { data } });

    it('run returns Invalid document when event has no data', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document' } });
        assert.equal(await block.run(ev(null)), 'Invalid document');
    });

    it('run returns Invalid document when data is undefined', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document' } });
        assert.equal(await block.run({ user: makeUser(), data: {} }), 'Invalid document');
    });

    it('validateDocument returns Invalid document for null doc', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document' } });
        const r = await block.validateDocument(block, ev(null), null);
        assert.equal(r, 'Invalid document');
    });

    it('vc-document passes a real VC', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document' } });
        assert.equal(await block.run(ev(vcDoc())), null);
    });

    it('vc-document rejects a VP document type', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document' } });
        const vp = { document: { verifiableCredential: [{ credentialSubject: [{}] }] } };
        assert.equal(await block.run(ev(vp)), 'Invalid document type');
    });

    it('vp-document passes a VP document', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vp-document' } });
        const vp = { document: { verifiableCredential: [{ credentialSubject: [{}] }] } };
        assert.equal(await block.run(ev(vp)), null);
    });

    it('vp-document rejects a plain VC', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vp-document' } });
        assert.equal(await block.run(ev(vcDoc())), 'Invalid document type');
    });

    it('document with no .document yields Document does not exist (getDocumentType null path)', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document' } });
        const r = await block.run(ev({ id: 'x' }));
        assert.equal(r, 'Invalid document type');
    });

    it('checkOwnerDocument rejects mismatched owner', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', checkOwnerDocument: true } });
        const r = await block.run(ev(vcDoc({ owner: 'did:other' }), makeUser({ did: 'did:me' })));
        assert.equal(r, 'Invalid owner');
    });

    it('checkOwnerDocument passes matching owner', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', checkOwnerDocument: true } });
        const r = await block.run(ev(vcDoc({ owner: 'did:me' }), makeUser({ did: 'did:me' })));
        assert.equal(r, null);
    });

    it('checkOwnerByGroupDocument rejects mismatched group', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', checkOwnerByGroupDocument: true } });
        const r = await block.run(ev(vcDoc({ group: 'g1' }), makeUser({ group: 'g2' })));
        assert.equal(r, 'Invalid group');
    });

    it('checkOwnerByGroupDocument passes matching group', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', checkOwnerByGroupDocument: true } });
        const r = await block.run(ev(vcDoc({ group: 'g1' }), makeUser({ group: 'g1' })));
        assert.equal(r, null);
    });

    it('checkAssignDocument rejects mismatched assignee', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', checkAssignDocument: true } });
        const r = await block.run(ev(vcDoc({ assignedTo: 'did:a' }), makeUser({ did: 'did:b' })));
        assert.equal(r, 'Invalid assigned user');
    });

    it('checkAssignDocument passes matching assignee', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', checkAssignDocument: true } });
        const r = await block.run(ev(vcDoc({ assignedTo: 'did:b' }), makeUser({ did: 'did:b' })));
        assert.equal(r, null);
    });

    it('checkAssignByGroupDocument rejects mismatched assigned group', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', checkAssignByGroupDocument: true } });
        const r = await block.run(ev(vcDoc({ assignedToGroup: 'g1' }), makeUser({ group: 'g2' })));
        assert.equal(r, 'Invalid assigned group');
    });

    it('conditions equal filter passes', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', conditions: [{ type: 'equal', field: 'owner', value: 'did:owner' }] } });
        assert.equal(await block.run(ev(vcDoc())), null);
    });

    it('conditions equal filter fails', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', conditions: [{ type: 'equal', field: 'owner', value: 'nope' }] } });
        assert.equal(await block.run(ev(vcDoc())), 'Invalid document');
    });

    it('conditions not_equal filter passes', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', conditions: [{ type: 'not_equal', field: 'owner', value: 'nope' }] } });
        assert.equal(await block.run(ev(vcDoc())), null);
    });

    it('multiple conditions short-circuit on first failure', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document', conditions: [{ type: 'equal', field: 'owner', value: 'did:owner' }, { type: 'equal', field: 'owner', value: 'x' }] } });
        assert.equal(await block.run(ev(vcDoc())), 'Invalid document');
    });

    it('run over an array returns null when all pass', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document' } });
        assert.equal(await block.run(ev([vcDoc(), vcDoc({ id: 'vc-2' })])), null);
    });

    it('run over an array returns the first error encountered', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document' } });
        const bad = { document: { verifiableCredential: [{}] } };
        assert.equal(await block.run(ev([vcDoc(), bad])), 'Invalid document type');
    });

    it('related-vc-document with no ref resolves to Document does not exist', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'related-vc-document' } });
        const r = await block.run(ev(vcDoc()));
        assert.equal(r, 'Document does not exist');
    });

    it('related-vc-document loads the referenced VC and validates type', async () => {
        const related = vcDoc({ id: 'vc-rel' });
        let queried = 0;
        const db = makeDb({ getVcDocument: async () => { queried++; return related; } });
        const { block } = makeBlock(DocumentValidatorBlock, {
            options: { documentType: 'related-vc-document' },
            componentsOverrides: { databaseServer: db },
        });
        const doc = { document: { credentialSubject: [{ ref: 'ref-123' }] } };
        const r = await block.run(ev(doc));
        assert.equal(r, null);
        assert.equal(queried, 1);
    });

    it('related-vc-document with missing referenced VC returns Document does not exist', async () => {
        const db = makeDb({ getVcDocument: async () => null });
        const { block } = makeBlock(DocumentValidatorBlock, {
            options: { documentType: 'related-vc-document' },
            componentsOverrides: { databaseServer: db },
        });
        const doc = { document: { credentialSubject: [{ ref: 'ref-123' }] } };
        assert.equal(await block.run(ev(doc)), 'Document does not exist');
    });

    it('related-vp-document loads the referenced VP', async () => {
        const relatedVp = { document: { verifiableCredential: [{ credentialSubject: [{}] }] } };
        let queried = 0;
        const db = makeDb({ getVpDocument: async () => { queried++; return relatedVp; } });
        const { block } = makeBlock(DocumentValidatorBlock, {
            options: { documentType: 'related-vp-document' },
            componentsOverrides: { databaseServer: db },
        });
        const doc = { document: { credentialSubject: [{ ref: 'ref-99' }] } };
        assert.equal(await block.run(ev(doc)), null);
        assert.equal(queried, 1);
    });

    it('runAction triggers Run/Release/Refresh and returns event.data on success', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document' } });
        const captured = instrument(block);
        const event = ev(vcDoc());
        const out = await block.runAction(event);
        assert.equal(out, event.data);
        assert.equal(captured.length, 3);
        assert.equal(captured[0][0], 'RunEvent');
        assert.equal(captured[1][0], 'ReleaseEvent');
        assert.equal(captured[2][0], 'RefreshEvent');
    });

    it('runAction does not emit success events on validation failure', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vp-document' } });
        const captured = instrument(block);
        await block.runAction(ev(vcDoc())).catch(() => {});
        assert.equal(captured.length, 0);
    });

    it('runAction emits a Run external event on success', async () => {
        const { block } = makeBlock(DocumentValidatorBlock, { options: { documentType: 'vc-document' } });
        instrument(block);
        await block.runAction(ev(vcDoc()));
        assert.equal(externalEvents.length, 1);
    });
});

describe('@unit extract-data-block runtime', () => {
    after(() => restoreHarness());

    function withSchema(block, type, fieldPath) {
        block._schema = {
            type,
            searchFields: (pred) => {
                const f = { isRef: true, type, path: fieldPath };
                return pred(f) ? [f] : [];
            },
        };
        block.getSchema = async () => ({
            searchFields: (pred) => {
                const f = { isRef: true, type, path: fieldPath };
                return pred(f) ? [f] : [];
            },
        });
    }

    it('compareSchema matches ref field type to iri with # normalization', () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        assert.equal(block.compareSchema({ isRef: true, type: 'Foo' }, 'Foo'), true);
        assert.equal(block.compareSchema({ isRef: true, type: '#Foo' }, 'Foo'), true);
        assert.equal(block.compareSchema({ isRef: true, type: 'Foo' }, '#Foo'), true);
    });

    it('compareSchema returns false for non-ref fields', () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        assert.equal(block.compareSchema({ isRef: false, type: 'Foo' }, 'Foo'), false);
    });

    it('compareSchema returns false when types differ', () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        assert.equal(block.compareSchema({ isRef: true, type: 'Foo' }, 'Bar'), false);
    });

    it('getDocuments wraps a single document into an array', () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        assert.deepEqual(block.getDocuments({ a: 1 }), [{ a: 1 }]);
    });

    it('getDocuments returns array unchanged', () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        const arr = [{ a: 1 }];
        assert.equal(block.getDocuments(arr), arr);
    });

    it('getDocuments returns null for nullish input', () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        assert.equal(block.getDocuments(null), null);
        assert.equal(block.getDocuments(undefined), null);
    });

    it('searchFieldsPath collects nested object leaves from credentialSubject', () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        const doc = { document: { credentialSubject: [{ nested: { leaf: { v: 7 } } }] } };
        const r = block.searchFieldsPath(doc, 'nested.leaf');
        assert.deepEqual(r, [{ v: 7 }]);
    });

    it('searchFieldsPath does not collect scalar leaves (object-only contract)', () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        const doc = { document: { credentialSubject: [{ nested: { leaf: 7 } }] } };
        assert.deepEqual(block.searchFieldsPath(doc, 'nested.leaf'), []);
    });

    it('searchFieldsPath descends into arrays of subjects', () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        const doc = { document: { credentialSubject: [{ items: [{ leaf: { v: 1 } }, { leaf: { v: 2 } }] }] } };
        const r = block.searchFieldsPath(doc, 'items.leaf');
        assert.deepEqual(r.map((x) => x.v).sort(), [1, 2]);
    });

    it('searchFieldsPath returns empty array for absent path', () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        const doc = { document: { credentialSubject: [{}] } };
        assert.deepEqual(block.searchFieldsPath(doc, 'missing'), []);
    });

    it('extract pushes matching subjects into result', async () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        withSchema(block, 'Sub', 'child');
        const doc = { schema: '#Root', document: { credentialSubject: [{ child: { x: 1 } }] } };
        const result = [];
        await block.extract(doc, 'Sub', result);
        assert.deepEqual(result, [{ x: 1 }]);
    });

    it('extract adds nothing when getSchema returns null', async () => {
        const { block } = makeBlock(ExtractDataBlock, { options: {} });
        block.getSchema = async () => null;
        const result = [];
        await block.extract({ schema: '#R', document: { credentialSubject: [{}] } }, 'Sub', result);
        assert.deepEqual(result, []);
    });

    it('runAction get path builds unsigned VCs from extracted subjects', async () => {
        const { block } = makeBlock(ExtractDataBlock, { options: { action: 'get' } });
        const captured = instrument(block);
        withSchema(block, 'Sub', 'child');
        const doc = { schema: '#Root', document: { credentialSubject: [{ child: { x: 5 } }] } };
        const event = { user: makeUser(), data: { data: doc } };
        const out = await block.runAction(event);
        assert.equal(out, event.data);
        assert.equal(captured.length, 1);
        assert.equal(captured[0][0], 'RunEvent');
        const state = captured[0][2];
        assert.equal(state.source, doc);
        assert.equal(state.data.length, 1);
    });

    it('runAction get path over array extracts from each doc', async () => {
        const { block } = makeBlock(ExtractDataBlock, { options: { action: 'get' } });
        const captured = instrument(block);
        withSchema(block, 'Sub', 'child');
        const docs = [
            { schema: '#R', document: { credentialSubject: [{ child: { x: 1 } }] } },
            { schema: '#R', document: { credentialSubject: [{ child: { x: 2 } }] } },
        ];
        await block.runAction({ user: makeUser(), data: { data: docs } });
        assert.equal(captured[0][2].data.length, 2);
    });

    it('getAction throws on empty documents', async () => {
        const { block } = makeBlock(ExtractDataBlock, { options: { action: 'get' } });
        block._schema = { type: 'Sub' };
        instrument(block);
        await assert.rejects(() => block.getAction(block, { user: makeUser(), data: { data: null } }), /Invalid documents/);
    });

    it('runAction set path merges new subjects into sources', async () => {
        const { block } = makeBlock(ExtractDataBlock, { options: { action: 'set' } });
        const captured = instrument(block);
        withSchema(block, 'Sub', 'child');
        const source = { schema: '#R', document: { credentialSubject: [{ child: { keep: 1 } }] } };
        const newDoc = { document: { credentialSubject: [{ added: 2 }] } };
        const event = { user: makeUser(), data: { source, data: newDoc } };
        await block.runAction(event);
        assert.equal(captured[0][0], 'RunEvent');
        assert.deepEqual(source.document.credentialSubject[0].child, { keep: 1, added: 2 });
    });

    it('setAction throws on count mismatch', async () => {
        const { block } = makeBlock(ExtractDataBlock, { options: { action: 'set' } });
        instrument(block);
        withSchema(block, 'Sub', 'child');
        const source = { schema: '#R', document: { credentialSubject: [{ child: { a: 1 } }] } };
        const event = { user: makeUser(), data: { source, data: [{ document: { credentialSubject: [{}] } }, { document: { credentialSubject: [{}] } }] } };
        await assert.rejects(() => block.setAction(block, event), /Invalid documents count/);
    });

    it('setAction throws when sources missing', async () => {
        const { block } = makeBlock(ExtractDataBlock, { options: { action: 'set' } });
        block._schema = { type: 'Sub' };
        instrument(block);
        await assert.rejects(() => block.setAction(block, { user: makeUser(), data: { source: null, data: [{}] } }), /Invalid documents/);
    });
});

describe('@unit reassigning-block runtime', () => {
    after(() => restoreHarness());

    function stubReassign(block) {
        block.documentReassigning = async (doc, user) => ({
            item: { ...doc, reassigned: true },
            actor: { ...user, did: 'did:actor' },
        });
    }

    it('runAction reassigns a single document and rewrites event.data.data', async () => {
        const { block } = makeBlock(ReassigningBlock, { options: { issuer: '', actor: '' } });
        stubReassign(block);
        const captured = instrument(block);
        const doc = vcDoc();
        const event = { user: makeUser(), data: { data: doc } };
        const out = await block.runAction(event);
        assert.equal(out.data.reassigned, true);
        assert.equal(captured.length, 3);
        assert.equal(captured[0][1].did, 'did:actor');
    });

    it('runAction reassigns each document of an array', async () => {
        const { block } = makeBlock(ReassigningBlock, { options: {} });
        stubReassign(block);
        const captured = instrument(block);
        const event = { user: makeUser(), data: { data: [vcDoc(), vcDoc({ id: 'b' })] } };
        const out = await block.runAction(event);
        assert.equal(Array.isArray(out.data), true);
        assert.equal(out.data.length, 2);
        assert.equal(out.data[0].reassigned, true);
        assert.equal(captured.length, 3);
    });

    it('runAction triggers Run/Release/Refresh with the resolved actor', async () => {
        const { block } = makeBlock(ReassigningBlock, { options: {} });
        stubReassign(block);
        const captured = instrument(block);
        await block.runAction({ user: makeUser(), data: { data: vcDoc() } });
        assert.deepEqual(captured.map((c) => c[0]), ['RunEvent', 'ReleaseEvent', 'RefreshEvent']);
    });

    it('runAction emits a Run external event', async () => {
        const { block } = makeBlock(ReassigningBlock, { options: {} });
        stubReassign(block);
        instrument(block);
        await block.runAction({ user: makeUser(), data: { data: vcDoc() } });
        assert.equal(externalEvents.length, 1);
    });
});

describe('@unit multi-sign-block runtime', () => {
    after(() => restoreHarness());

    const signRole = (status) => ({ status });

    it('getData reports block identity and readonly false for local user', async () => {
        const { block } = makeBlock(MultiSignBlock, { options: { type: 'multiSign', threshold: '50' } });
        const data = await block.getData(makeUser());
        assert.equal(data.id, 'uuid-1');
        assert.equal(data.blockType, 'multiSignBlock');
        assert.equal(data.readonly, false);
    });

    it('getData is readonly for a remote user on a remote block', async () => {
        const { block } = makeBlock(MultiSignBlock, {
            options: { threshold: '50' },
            policyOverrides: { locationType: LocationType.REMOTE },
        });
        const data = await block.getData(makeUser({ location: LocationType.REMOTE }));
        assert.equal(data.actionType, LocationType.REMOTE);
        assert.equal(data.readonly, true);
    });

    it('getDocumentStatus computes thresholds with 50% over 4 users', async () => {
        const db = makeDb({
            getMultiSignStatus: async () => null,
            getMultiSignDocuments: async () => [signRole('SIGNED'), signRole('SIGNED')],
            getAllUsersByRole: async () => [{}, {}, {}, {}],
        });
        const { block } = makeBlock(MultiSignBlock, {
            options: { threshold: 50 },
            componentsOverrides: { databaseServer: db },
        });
        const r = await block.getDocumentStatus({ id: 'd1' }, makeUser({ id: 'u1', group: 'g' }));
        assert.equal(r.total, 4);
        assert.equal(r.signedCount, 2);
        assert.equal(r.signedThreshold, 2);
        assert.equal(r.declinedThreshold, 3);
        assert.equal(r.signedPercent, 50);
    });

    it('getDocumentStatus reflects the current user document status', async () => {
        const db = makeDb({
            getMultiSignStatus: async () => null,
            getMultiSignDocuments: async () => [{ userId: 'u1', status: 'SIGNED' }, { userId: 'u2', status: 'DECLINED' }],
            getAllUsersByRole: async () => [{}, {}, {}],
        });
        const { block } = makeBlock(MultiSignBlock, {
            options: { threshold: 50 },
            componentsOverrides: { databaseServer: db },
        });
        const r = await block.getDocumentStatus({ id: 'd1' }, makeUser({ id: 'u1', group: 'g' }));
        assert.equal(r.documentStatus, 'SIGNED');
        assert.equal(r.signedCount, 1);
        assert.equal(r.declinedCount, 1);
    });

    it('getDocumentStatus surfaces a non-NEW confirmation status', async () => {
        const db = makeDb({
            getMultiSignStatus: async () => ({ status: 'SIGNED' }),
            getMultiSignDocuments: async () => [],
            getAllUsersByRole: async () => [{}, {}],
        });
        const { block } = makeBlock(MultiSignBlock, {
            options: { threshold: 50 },
            componentsOverrides: { databaseServer: db },
        });
        const r = await block.getDocumentStatus({ id: 'd1' }, makeUser({ id: 'u1', group: 'g' }));
        assert.equal(r.confirmationStatus, 'SIGNED');
    });

    it('getDocumentStatus keeps confirmationStatus null when status is NEW', async () => {
        const db = makeDb({
            getMultiSignStatus: async () => ({ status: 'NEW' }),
            getMultiSignDocuments: async () => [],
            getAllUsersByRole: async () => [{}, {}],
        });
        const { block } = makeBlock(MultiSignBlock, {
            options: { threshold: 50 },
            componentsOverrides: { databaseServer: db },
        });
        const r = await block.getDocumentStatus({ id: 'd1' }, makeUser({ id: 'u1', group: 'g' }));
        assert.equal(r.confirmationStatus, null);
    });

    it('getDocumentStatus threshold rounds up for non-divisible percentages', async () => {
        const db = makeDb({
            getMultiSignStatus: async () => null,
            getMultiSignDocuments: async () => [],
            getAllUsersByRole: async () => [{}, {}, {}],
        });
        const { block } = makeBlock(MultiSignBlock, {
            options: { threshold: 50 },
            componentsOverrides: { databaseServer: db },
        });
        const r = await block.getDocumentStatus({ id: 'd1' }, makeUser({ id: 'u1', group: 'g' }));
        assert.equal(r.signedThreshold, 2);
        assert.equal(r.declinedThreshold, 2);
    });

    it('joinData stamps block status onto a single document', async () => {
        const db = makeDb({
            getMultiSignStatus: async () => null,
            getMultiSignDocuments: async () => [],
            getAllUsersByRole: async () => [{}, {}],
        });
        const { block } = makeBlock(MultiSignBlock, {
            options: { type: 't', threshold: 50 },
            componentsOverrides: { databaseServer: db },
        });
        const doc = { id: 'd1' };
        const out = await block.joinData(doc, makeUser({ id: 'u1', group: 'g' }), null);
        assert.ok(out.blocks['uuid-1']);
        assert.equal(out.blocks['uuid-1'].status.total, 2);
    });

    it('joinData stamps block status onto each document of an array', async () => {
        const db = makeDb({
            getMultiSignStatus: async () => null,
            getMultiSignDocuments: async () => [],
            getAllUsersByRole: async () => [{}],
        });
        const { block } = makeBlock(MultiSignBlock, {
            options: { type: 't', threshold: 50 },
            componentsOverrides: { databaseServer: db },
        });
        const docs = [{ id: 'a' }, { id: 'b' }];
        const out = await block.joinData(docs, makeUser({ id: 'u1', group: 'g' }), null);
        assert.ok(out[0].blocks['uuid-1']);
        assert.ok(out[1].blocks['uuid-1']);
    });

    it('setData throws when the source document is missing', async () => {
        const db = makeDb({ getVcDocument: async () => null });
        const { block } = makeBlock(MultiSignBlock, {
            options: { threshold: 50 },
            componentsOverrides: { databaseServer: db },
        });
        await assert.rejects(
            () => block.setData(makeUser({ id: 'u1', group: 'g' }), { status: 'SIGNED', document: { id: 'd1' } }, null, null),
            /Invalid document/
        );
    });

    it('setData throws when the document was already signed at group level', async () => {
        const db = makeDb({
            getVcDocument: async () => ({ document: { credentialSubject: [{}] } }),
            getMultiSignStatus: async () => ({ status: 'SIGNED' }),
        });
        const { block } = makeBlock(MultiSignBlock, {
            options: { threshold: 50 },
            componentsOverrides: { databaseServer: db },
        });
        await assert.rejects(
            () => block.setData(makeUser({ id: 'u1', group: 'g' }), { status: 'SIGNED', document: { id: 'd1' } }, null, null),
            /already been signed/
        );
    });

    it('runAction is a no-op returning undefined', async () => {
        const { block } = makeBlock(MultiSignBlock, { options: { threshold: 50 } });
        assert.equal(await block.runAction({ user: makeUser(), data: { data: vcDoc() } }), undefined);
    });
});

describe('@unit aggregate-block runtime', () => {
    after(() => restoreHarness());

    it('aggregateScope returns empty object for empty scopes', () => {
        const { block } = makeBlock(AggregateBlock, { options: {} });
        assert.deepEqual(block.aggregateScope([]), {});
        assert.deepEqual(block.aggregateScope(null), {});
    });

    it('aggregateScope collects each key into arrays', () => {
        const { block } = makeBlock(AggregateBlock, { options: {} });
        const r = block.aggregateScope([{ a: 1, b: 2 }, { a: 3, b: 4 }]);
        assert.deepEqual(r, { a: [1, 3], b: [2, 4] });
    });

    it('expressions returns empty object when there are no expressions', () => {
        const { block } = makeBlock(AggregateBlock, { options: {} });
        assert.deepEqual(block.expressions(block, [], { document: {} }), {});
        assert.deepEqual(block.expressions(block, null, { document: {} }), {});
    });

    it('popDocuments removes the aggregate by hash', async () => {
        const db = makeDb({ removeAggregateDocument: makeDb().saveBlockState });
        const calls = [];
        db.removeAggregateDocument = async (...a) => { calls.push(a); };
        const { block } = makeBlock(AggregateBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        await block.popDocuments(block, { hash: 'h1' });
        assert.deepEqual(calls[0], ['h1', 'uuid-1']);
    });

    it('onPopEvent removes each document hash in an array', async () => {
        const calls = [];
        const db = makeDb();
        db.removeAggregateDocument = async (...a) => { calls.push(a); };
        const { block } = makeBlock(AggregateBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        block.backup = () => {};
        await block.onPopEvent({ user: makeUser(), data: { data: [{ hash: 'h1' }, { hash: 'h2' }] } });
        assert.equal(calls.length, 2);
        assert.deepEqual(calls.map((c) => c[0]), ['h1', 'h2']);
    });

    it('onPopEvent removes a single document hash', async () => {
        const calls = [];
        const db = makeDb();
        db.removeAggregateDocument = async (...a) => { calls.push(a); };
        const { block } = makeBlock(AggregateBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        block.backup = () => {};
        await block.onPopEvent({ user: makeUser(), data: { data: { hash: 'solo' } } });
        assert.deepEqual(calls[0][0], 'solo');
    });

    it('tickCron is a no-op when aggregateType is not period', async () => {
        const calls = [];
        const db = makeDb();
        db.getAggregateDocuments = async (...a) => { calls.push(a); return []; };
        const { block } = makeBlock(AggregateBlock, {
            options: { aggregateType: 'cumulative' },
            componentsOverrides: { databaseServer: db },
        });
        block.backup = () => {};
        await block.tickCron({ user: makeUser(), data: ['id1'] });
        assert.equal(calls.length, 0);
    });

    it('tickCron groups documents by scope id and sends per-group', async () => {
        const docs = [
            { owner: 'o1', document: {} },
            { owner: 'o1', document: {} },
            { owner: 'o2', document: {} },
        ];
        const db = makeDb({ getAggregateDocuments: async () => docs });
        db.removeAggregateDocuments = async () => {};
        const { block } = makeBlock(AggregateBlock, {
            options: { aggregateType: 'period', disableUserGrouping: false, groupByFields: [] },
            componentsOverrides: { databaseServer: db },
        });
        block.backup = () => {};
        const sent = [];
        block.sendCronDocuments = async (ref, userId, documents) => { sent.push({ userId, count: documents.length }); };
        await block.tickCron({ user: makeUser(), data: ['o1', 'o2'] });
        assert.equal(sent.length, 2);
        const o1 = sent.find((s) => s.userId === 'o1');
        assert.equal(o1.count, 2);
    });

    it('tickCron drops documents whose scope id is not in the id list', async () => {
        const docs = [{ owner: 'keep', document: {} }, { owner: 'drop', document: {} }];
        const db = makeDb({ getAggregateDocuments: async () => docs });
        const removed = [];
        db.removeAggregateDocuments = async (d) => { removed.push(...d); };
        const { block } = makeBlock(AggregateBlock, {
            options: { aggregateType: 'period', disableUserGrouping: false, groupByFields: [] },
            componentsOverrides: { databaseServer: db },
        });
        block.backup = () => {};
        const sent = [];
        block.sendCronDocuments = async (ref, userId) => { sent.push(userId); };
        await block.tickCron({ user: makeUser(), data: ['keep'] });
        assert.equal(removed.length, 1);
        assert.equal(removed[0].owner, 'drop');
        assert.deepEqual(sent, ['keep']);
    });

    it('tickCron with disableUserGrouping groups by document key only', async () => {
        const docs = [
            { owner: 'o1', document: { f: 'A' } },
            { owner: 'o2', document: { f: 'A' } },
            { owner: 'o3', document: { f: 'B' } },
        ];
        const db = makeDb({ getAggregateDocuments: async () => docs });
        db.removeAggregateDocuments = async () => {};
        const { block } = makeBlock(AggregateBlock, {
            options: { aggregateType: 'period', disableUserGrouping: true, groupByFields: [{ fieldPath: 'document.f' }] },
            componentsOverrides: { databaseServer: db },
        });
        block.backup = () => {};
        const sent = [];
        block.sendCronDocuments = async (ref, userId, documents) => { sent.push(documents.length); };
        await block.tickCron({ user: makeUser(), data: [] });
        assert.equal(sent.length, 2);
        assert.deepEqual(sent.sort(), [1, 2]);
    });

    it('removeDocuments restores source ids and returns the documents', async () => {
        const db = makeDb();
        let removed = null;
        db.removeAggregateDocuments = async (d) => { removed = d; };
        const { block } = makeBlock(AggregateBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const docs = [{ sourceDocumentId: { toString: () => 'src-1' } }];
        const r = await block.removeDocuments(block, docs);
        assert.equal(removed.length, 1);
        assert.equal(r[0].id, 'src-1');
        assert.equal(r[0].sourceDocumentId, undefined);
    });

    it('removeDocuments returns empty array untouched', async () => {
        const db = makeDb();
        let called = false;
        db.removeAggregateDocuments = async () => { called = true; };
        const { block } = makeBlock(AggregateBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const r = await block.removeDocuments(block, []);
        assert.deepEqual(r, []);
        assert.equal(called, false);
    });

    it('runAction saves documents and skips tickAggregate for non-cumulative type', async () => {
        const saved = [];
        const db = makeDb();
        db.createAggregateDocuments = async (item) => { saved.push(item); };
        const { block } = makeBlock(AggregateBlock, {
            options: { aggregateType: 'period' },
            componentsOverrides: { databaseServer: db },
        });
        let tickCalled = false;
        block.tickAggregate = async () => { tickCalled = true; };
        const event = { user: makeUser(), data: { data: [vcDoc(), vcDoc({ id: 'b' })] } };
        const out = await block.runAction(event);
        assert.equal(out, event.data);
        assert.equal(saved.length, 2);
        assert.equal(tickCalled, false);
    });

    it('runAction invokes tickAggregate per doc for cumulative type', async () => {
        const db = makeDb();
        db.createAggregateDocuments = async () => {};
        const { block } = makeBlock(AggregateBlock, {
            options: { aggregateType: 'cumulative' },
            componentsOverrides: { databaseServer: db },
        });
        let ticks = 0;
        block.tickAggregate = async () => { ticks++; };
        await block.runAction({ user: makeUser(), data: { data: [vcDoc(), vcDoc({ id: 'b' })] } });
        assert.equal(ticks, 2);
    });

    it('runAction handles a single document', async () => {
        const saved = [];
        const db = makeDb();
        db.createAggregateDocuments = async (item) => { saved.push(item); };
        const { block } = makeBlock(AggregateBlock, {
            options: { aggregateType: 'period' },
            componentsOverrides: { databaseServer: db },
        });
        block.tickAggregate = async () => {};
        await block.runAction({ user: makeUser(), data: { data: vcDoc() } });
        assert.equal(saved.length, 1);
    });

    it('runAction emits a Run external event', async () => {
        const db = makeDb();
        db.createAggregateDocuments = async () => {};
        const { block } = makeBlock(AggregateBlock, {
            options: { aggregateType: 'period' },
            componentsOverrides: { databaseServer: db },
        });
        block.tickAggregate = async () => {};
        await block.runAction({ user: makeUser(), data: { data: vcDoc() } });
        assert.equal(externalEvents.length, 1);
    });
});

describe('@unit split-block runtime', () => {
    after(() => restoreHarness());

    function setupSplit(block, db) {
        let n = 0;
        block.createNewDoc = async (ref, root, document, newValue) => ({ document: { id: `doc-${n++}`, value: newValue } });
        db.createResidue = (policyId, uuid, userId, value, newDoc) => ({ value, document: newDoc.document });
    }

    it('split with value below threshold accumulates residue without emitting a chunk', async () => {
        const db = makeDb();
        const { block } = makeBlock(SplitBlock, {
            options: { threshold: '100', sourceField: 'document.credentialSubject.0.amount' },
            componentsOverrides: { databaseServer: db },
        });
        setupSplit(block, db);
        const result = [];
        const doc = { document: { credentialSubject: [{ amount: 40 }] } };
        const residue = await block.split(block, {}, makeUser({ id: 'u1' }), result, [], doc, 'u1', null);
        assert.equal(result.length, 0);
        assert.equal(residue.length, 1);
        assert.equal(residue[0].value, 40);
    });

    it('split fills a chunk exactly when residue plus value reaches threshold', async () => {
        const db = makeDb();
        const { block } = makeBlock(SplitBlock, {
            options: { threshold: '100', sourceField: 'document.credentialSubject.0.amount' },
            componentsOverrides: { databaseServer: db },
        });
        setupSplit(block, db);
        const result = [];
        const existing = [{ value: 60 }];
        const doc = { document: { credentialSubject: [{ amount: 40 }] } };
        const residue = await block.split(block, {}, makeUser({ id: 'u1' }), result, existing, doc, 'u1', null);
        assert.equal(result.length, 1);
        assert.equal(residue.length, 0);
        assert.equal(result[0].reduce((s, r) => s + r.value, 0), 100);
    });

    it('split chunks a large value into multiple full chunks plus remainder', async () => {
        const db = makeDb();
        const { block } = makeBlock(SplitBlock, {
            options: { threshold: '100', sourceField: 'document.credentialSubject.0.amount' },
            componentsOverrides: { databaseServer: db },
        });
        setupSplit(block, db);
        const result = [];
        const doc = { document: { credentialSubject: [{ amount: 250 }] } };
        const residue = await block.split(block, {}, makeUser({ id: 'u1' }), result, [], doc, 'u1', null);
        assert.equal(result.length, 2);
        assert.equal(residue.length, 1);
        assert.equal(residue[0].value, 50);
    });

    it('split resets a satisfied incoming residue before processing value', async () => {
        const db = makeDb();
        const { block } = makeBlock(SplitBlock, {
            options: { threshold: '100', sourceField: 'document.credentialSubject.0.amount' },
            componentsOverrides: { databaseServer: db },
        });
        setupSplit(block, db);
        const result = [];
        const existing = [{ value: 100 }];
        const doc = { document: { credentialSubject: [{ amount: 30 }] } };
        const residue = await block.split(block, {}, makeUser({ id: 'u1' }), result, existing, doc, 'u1', null);
        assert.equal(result.length, 1);
        assert.deepEqual(result[0], existing);
        assert.equal(residue[0].value, 30);
    });

    it('calcDocValue parses the source field number', async () => {
        const { block } = makeBlock(SplitBlock, { options: { sourceField: 'document.credentialSubject.0.amount' } });
        const v = await block.calcDocValue(block, { document: { credentialSubject: [{ amount: '12.5' }] } }, makeUser());
        assert.equal(v, 12.5);
    });

    it('calcDocValue returns NaN for a missing field', async () => {
        const { block } = makeBlock(SplitBlock, { options: { sourceField: 'document.missing' } });
        const v = await block.calcDocValue(block, { document: {} }, makeUser());
        assert.ok(Number.isNaN(v));
    });

    it('addDocs emits one chunk and a refresh for a single full document', async () => {
        const db = makeDb({ getResidue: async () => [] });
        db.removeResidue = async () => {};
        db.setResidue = async () => {};
        const { block } = makeBlock(SplitBlock, {
            options: { threshold: '100', sourceField: 'document.credentialSubject.0.amount' },
            componentsOverrides: { databaseServer: db },
        });
        setupSplit(block, db);
        const orig = PolicyUtils.getUserCredentials;
        PolicyUtils.getUserCredentials = async () => ({});
        try {
            const captured = instrument(block);
            const doc = { document: { credentialSubject: [{ amount: 100 }] } };
            await block.addDocs(block, makeUser({ id: 'u1' }), [doc], 'u1', null);
            const runs = captured.filter((c) => c[0] === 'RunEvent');
            const refresh = captured.filter((c) => c[0] === 'RefreshEvent');
            assert.equal(runs.length, 1);
            assert.equal(refresh.length, 1);
        } finally {
            PolicyUtils.getUserCredentials = orig;
        }
    });

    it('addDocs only refreshes when nothing reaches the threshold', async () => {
        const db = makeDb({ getResidue: async () => [] });
        db.removeResidue = async () => {};
        db.setResidue = async () => {};
        const { block } = makeBlock(SplitBlock, {
            options: { threshold: '100', sourceField: 'document.credentialSubject.0.amount' },
            componentsOverrides: { databaseServer: db },
        });
        setupSplit(block, db);
        const orig = PolicyUtils.getUserCredentials;
        PolicyUtils.getUserCredentials = async () => ({});
        try {
            const captured = instrument(block);
            const doc = { document: { credentialSubject: [{ amount: 10 }] } };
            await block.addDocs(block, makeUser({ id: 'u1' }), [doc], 'u1', null);
            assert.equal(captured.filter((c) => c[0] === 'RunEvent').length, 0);
            assert.equal(captured.filter((c) => c[0] === 'RefreshEvent').length, 1);
        } finally {
            PolicyUtils.getUserCredentials = orig;
        }
    });

    it('runAction wraps a single document and delegates to addDocs', async () => {
        const { block } = makeBlock(SplitBlock, { options: { threshold: '100', sourceField: 'x' } });
        block.backup = () => {};
        let received = null;
        block.addDocs = async (ref, user, documents) => { received = documents; };
        const event = { user: makeUser(), data: { data: vcDoc() } };
        const out = await block.runAction(event);
        assert.equal(out, event.data);
        assert.equal(received.length, 1);
    });

    it('runAction passes an array straight through to addDocs', async () => {
        const { block } = makeBlock(SplitBlock, { options: { threshold: '100', sourceField: 'x' } });
        block.backup = () => {};
        let received = null;
        block.addDocs = async (ref, user, documents) => { received = documents; };
        await block.runAction({ user: makeUser(), data: { data: [vcDoc(), vcDoc({ id: 'b' })] } });
        assert.equal(received.length, 2);
    });

    it('runAction emits a Run external event before splitting', async () => {
        const { block } = makeBlock(SplitBlock, { options: { threshold: '100', sourceField: 'x' } });
        block.backup = () => {};
        block.addDocs = async () => {};
        await block.runAction({ user: makeUser(), data: { data: vcDoc() } });
        assert.equal(externalEvents.length, 1);
    });
});

describe('@unit set-relationships-block runtime', () => {
    after(() => restoreHarness());

    function withSources(block, sources) {
        block.getSources = async () => sources;
    }

    it('appends source relationships to a single target document', async () => {
        const { block } = makeBlock(SetRelationshipsBlock, { options: {} });
        block.backup = () => {};
        const captured = instrument(block);
        withSources(block, [{ owner: 'o', messageId: 'm1' }, { messageId: 'm2' }]);
        const target = { id: 't' };
        const event = { user: makeUser(), data: { data: target } };
        await block.runAction(event);
        assert.deepEqual(target.relationships, ['m1', 'm2']);
        assert.equal(captured.filter((c) => c[0] === 'RunEvent').length, 1);
    });

    it('dedupes repeated source messageIds', async () => {
        const { block } = makeBlock(SetRelationshipsBlock, { options: {} });
        block.backup = () => {};
        instrument(block);
        withSources(block, [{ messageId: 'm1' }, { messageId: 'm1' }]);
        const target = { id: 't' };
        await block.runAction({ user: makeUser(), data: { data: target } });
        assert.deepEqual(target.relationships, ['m1']);
    });

    it('concatenates onto existing relationships of an array target', async () => {
        const { block } = makeBlock(SetRelationshipsBlock, { options: {} });
        block.backup = () => {};
        instrument(block);
        withSources(block, [{ messageId: 'm1' }]);
        const docs = [{ relationships: ['pre'] }];
        await block.runAction({ user: makeUser(), data: { data: docs } });
        assert.deepEqual(docs[0].relationships, ['pre', 'm1']);
    });

    it('includeAccounts merges source accounts into the target', async () => {
        const { block } = makeBlock(SetRelationshipsBlock, { options: { includeAccounts: true } });
        block.backup = () => {};
        instrument(block);
        withSources(block, [{ accounts: { a: '1' } }, { accounts: { b: '2' } }]);
        const target = { id: 't' };
        await block.runAction({ user: makeUser(), data: { data: target } });
        assert.deepEqual(target.accounts, { a: '1', b: '2' });
    });

    it('includeTokens merges source tokens into the target', async () => {
        const { block } = makeBlock(SetRelationshipsBlock, { options: { includeTokens: true } });
        block.backup = () => {};
        instrument(block);
        withSources(block, [{ tokens: { t: '0.0.1' } }]);
        const target = { id: 't' };
        await block.runAction({ user: makeUser(), data: { data: target } });
        assert.deepEqual(target.tokens, { t: '0.0.1' });
    });

    it('changeOwner copies owner and group from first source', async () => {
        const { block } = makeBlock(SetRelationshipsBlock, { options: { changeOwner: true } });
        block.backup = () => {};
        instrument(block);
        withSources(block, [{ owner: 'src-owner', group: 'src-group' }]);
        const target = { id: 't', owner: 'old', group: 'oldg' };
        await block.runAction({ user: makeUser(), data: { data: target } });
        assert.equal(target.owner, 'src-owner');
        assert.equal(target.group, 'src-group');
    });

    it('changeOwner leaves owner untouched when first source has none', async () => {
        const { block } = makeBlock(SetRelationshipsBlock, { options: { changeOwner: true } });
        block.backup = () => {};
        instrument(block);
        withSources(block, [{ messageId: 'm1' }]);
        const target = { id: 't', owner: 'old' };
        await block.runAction({ user: makeUser(), data: { data: target } });
        assert.equal(target.owner, 'old');
    });

    it('does not mutate accounts/tokens when flags are off', async () => {
        const { block } = makeBlock(SetRelationshipsBlock, { options: {} });
        block.backup = () => {};
        instrument(block);
        withSources(block, [{ accounts: { a: '1' }, tokens: { t: '1' } }]);
        const target = { id: 't' };
        await block.runAction({ user: makeUser(), data: { data: target } });
        assert.equal(target.accounts, undefined);
        assert.equal(target.tokens, undefined);
    });

    it('handles a missing documents payload without throwing', async () => {
        const { block } = makeBlock(SetRelationshipsBlock, { options: {} });
        block.backup = () => {};
        const captured = instrument(block);
        withSources(block, [{ messageId: 'm1' }]);
        const event = { user: makeUser(), data: {} };
        await block.runAction(event);
        assert.equal(captured.filter((c) => c[0] === 'RunEvent').length, 1);
    });

    it('triggers Run then Release and emits an external event', async () => {
        const { block } = makeBlock(SetRelationshipsBlock, { options: {} });
        block.backup = () => {};
        const captured = instrument(block);
        withSources(block, []);
        await block.runAction({ user: makeUser(), data: { data: { id: 't' } } });
        assert.deepEqual(captured.map((c) => c[0]), ['RunEvent', 'ReleaseEvent']);
        assert.equal(externalEvents.length, 1);
    });
});

describe('@unit filters-addon-block runtime', () => {
    after(() => restoreHarness());

    const user = makeUser({ id: 'u1' });

    it('addQuery builds an eq expression onto the filter', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', queryType: 'equal' } });
        const filter = {};
        await block.addQuery(filter, 'val', user);
        assert.deepEqual(filter['document.f'], { $eq: 'val' });
    });

    it('addQuery builds an in expression from a comma list', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', queryType: 'in' } });
        const filter = {};
        await block.addQuery(filter, 'a,b,c', user);
        assert.deepEqual(filter['document.f'], { $in: ['a', 'b', 'c'] });
    });

    it('addQuery builds a regex expression', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', queryType: 'regex' } });
        const filter = {};
        await block.addQuery(filter, 'abc', user);
        assert.deepEqual(filter['document.f'], { $regex: '.*abc.*' });
    });

    it('addQuery throws when the query yields no expression', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', queryType: 'equal' } });
        await assert.rejects(() => block.addQuery({}, null, user), /Unknown filter type/);
    });

    it('getData returns the block envelope with options carried through', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { type: 'input', queryType: 'equal', canBeEmpty: true } });
        block.getSources = async () => [];
        const data = await block.getData(user);
        assert.equal(data.id, 'uuid-1');
        assert.equal(data.blockType, 'filtersAddon');
        assert.equal(data.type, 'input');
        assert.equal(data.canBeEmpty, true);
        assert.equal(data.queryType, 'equal');
    });

    it('getData for dropdown builds deduped name/value pairs from sources', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { type: 'dropdown', optionName: 'name', optionValue: 'value' } });
        block.getSources = async () => [
            { name: 'A', value: '1' },
            { name: 'B', value: '2' },
            { name: 'A-dup', value: '1' },
        ];
        const data = await block.getData(user);
        assert.equal(data.data.length, 2);
        assert.deepEqual(data.data.map((d) => d.value).sort(), ['1', '2']);
        assert.equal(data.optionName, 'name');
        assert.equal(data.optionValue, 'value');
    });

    it('getData for dropdown caches lastData on block state', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { type: 'dropdown', optionName: 'name', optionValue: 'value' } });
        block.getSources = async () => [{ name: 'A', value: '1' }];
        await block.getData(user);
        assert.equal(block.state['u1'].lastData.length, 1);
    });

    it('getData is readonly for a remote user on a remote block', async () => {
        const { block } = makeBlock(FiltersAddonBlock, {
            options: { type: 'input' },
            policyOverrides: { locationType: LocationType.REMOTE },
        });
        block.actionType = LocationType.REMOTE;
        block.getSources = async () => [];
        const data = await block.getData(makeUser({ id: 'u2', location: LocationType.REMOTE }));
        assert.equal(data.readonly, true);
    });

    it('getFilters returns the existing user filter unchanged', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', type: 'input', canBeEmpty: true } });
        block.filters['u1'] = { 'document.f': { $eq: 'cached' } };
        const r = await block.getFilters(user);
        assert.deepEqual(r['document.f'], { $eq: 'cached' });
    });

    it('getFilters with canBeEmpty leaves filters empty when none set', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', type: 'input', canBeEmpty: true } });
        const r = await block.getFilters(user);
        assert.deepEqual(r, {});
    });

    it('getFilters for a dropdown resolves a default option value', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', type: 'dropdown', optionValue: 'value', queryType: 'equal' } });
        block.getSources = async () => [{ value: 'first' }];
        const r = await block.getFilters(user);
        assert.deepEqual(r['document.f'], { $eq: 'first' });
        assert.equal(block.state['u1'].lastValue, 'first');
    });

    it('setFiltersStrict throws when value is empty and canBeEmpty is false', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', type: 'input', queryType: 'equal' } });
        await assert.rejects(() => block.setFiltersStrict(user, { filterValue: '' }), /filter value is unknown/);
    });

    it('setFiltersStrict throws when data is missing', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', type: 'input' } });
        await assert.rejects(() => block.setFiltersStrict(user, null), /filter value is unknown/);
    });

    it('setFiltersStrict sets an input filter and records state', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', type: 'input', queryType: 'equal' } });
        let setArgs = null;
        block.setFilters = (filter, u) => { setArgs = [filter, u]; block.filters[u.id] = filter; };
        await block.setFiltersStrict(user, { filterValue: 'hello' });
        assert.deepEqual(setArgs[0]['document.f'], { $eq: 'hello' });
        assert.equal(block.state['u1'].lastValue, 'hello');
    });

    it('setFilterState rejects a value absent from dropdown lastData', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', type: 'dropdown', optionValue: 'value', queryType: 'equal' } });
        block.getSources = async () => [{ value: 'known' }];
        block.setFilters = () => {};
        await assert.rejects(() => block.setFilterState(user, { filterValue: 'unknown' }), /filter value is unknown/);
    });

    it('setFilterState accepts a value present in pre-populated dropdown lastData', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', type: 'dropdown', optionName: 'name', optionValue: 'value', queryType: 'equal' } });
        block.state[user.id] = { lastData: [{ name: 'K', value: 'known' }] };
        let captured = null;
        block.setFilters = (filter) => { captured = filter; };
        await block.setFilterState(user, { filterValue: 'known' });
        assert.deepEqual(captured['document.f'], { $eq: 'known' });
    });

    it('setFilterState rejects dropdown values when lastData was only just loaded (stale local copy)', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', type: 'dropdown', optionName: 'name', optionValue: 'value', queryType: 'equal' } });
        block.getSources = async () => [{ name: 'K', value: 'known' }];
        block.setFilters = () => {};
        await assert.rejects(() => block.setFilterState(user, { filterValue: 'known' }), /filter value is unknown/);
    });

    it('setFilterState for input sets the filter directly', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { field: 'document.f', type: 'input', queryType: 'equal' } });
        let captured = null;
        block.setFilters = (filter) => { captured = filter; };
        await block.setFilterState(user, { filterValue: 'xx' });
        assert.deepEqual(captured['document.f'], { $eq: 'xx' });
    });

    it('checkValues returns false when lastData is not an array', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { queryType: 'equal' } });
        const r = await block.checkValues({ lastData: null }, 'v', user);
        assert.equal(r, false);
    });

    it('checkValues matches a single scalar value against lastData', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { queryType: 'equal' } });
        const blockState = { lastData: [{ value: '1' }, { value: '2' }] };
        assert.equal(await block.checkValues(blockState, '2', user), true);
        assert.equal(await block.checkValues(blockState, '9', user), false);
    });

    it('checkValues requires every element of an in-list to be present', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: { queryType: 'in' } });
        const blockState = { lastData: [{ value: 'a' }, { value: 'b' }, { value: 'c' }] };
        assert.equal(await block.checkValues(blockState, 'a,b', user), true);
        assert.equal(await block.checkValues(blockState, 'a,z', user), false);
    });

    it('resetFilters restores the previous state and filters', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: {} });
        block.previousState['u1'] = { lastValue: 'prev' };
        block.previousFilters['u1'] = { 'document.f': { $eq: 'prev' } };
        block.filters['u1'] = { 'document.f': { $eq: 'now' } };
        await block.resetFilters(user);
        assert.deepEqual(block.state['u1'], { lastValue: 'prev' });
        assert.deepEqual(block.filters['u1'], { 'document.f': { $eq: 'prev' } });
    });

    it('resetFilters is a no-op when there is no previous state', async () => {
        const { block } = makeBlock(FiltersAddonBlock, { options: {} });
        block.filters['u1'] = { keep: 1 };
        await block.resetFilters(user);
        assert.deepEqual(block.filters['u1'], { keep: 1 });
    });
});
