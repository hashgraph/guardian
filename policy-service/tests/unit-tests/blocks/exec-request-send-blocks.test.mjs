import assert from 'node:assert/strict';
import { LocationType, DocumentStatus, DocumentSignature } from '@guardian/interfaces';
import { MessageServer, VcDocumentDefinition as VcDocumentRef, VcHelper } from '@guardian/common';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';
import { DocumentType } from '../../../dist/policy-engine/interfaces/document.type.js';
import { makeBlock, makeUser, makeDb, restoreHarness } from './_block-exec-harness.mjs';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
import { RequestVcDocumentBlockAddon } from '../../../dist/policy-engine/blocks/request-vc-document-block-addon.js';
import { SendToGuardianBlock } from '../../../dist/policy-engine/blocks/send-to-guardian-block.js';
import { RevokeBlock } from '../../../dist/policy-engine/blocks/revoke-block.js';
import { RevocationBlock } from '../../../dist/policy-engine/blocks/revocation-block.js';
import { UploadVcDocumentBlock } from '../../../dist/policy-engine/blocks/upload-vc-document-block.js';

const _origUtils = {};
const _origActions = {};
const _origMsg = {};

function patchUtils(map) {
    for (const [k, v] of Object.entries(map)) {
        if (!(k in _origUtils)) _origUtils[k] = PolicyUtils[k];
        PolicyUtils[k] = v;
    }
}
function patchActions(map) {
    for (const [k, v] of Object.entries(map)) {
        if (!(k in _origActions)) _origActions[k] = PolicyActionsUtils[k];
        PolicyActionsUtils[k] = v;
    }
}
function patchMsg(map) {
    for (const [k, v] of Object.entries(map)) {
        if (!(k in _origMsg)) _origMsg[k] = MessageServer[k];
        MessageServer[k] = v;
    }
}
function restoreStatics() {
    for (const [k, v] of Object.entries(_origUtils)) PolicyUtils[k] = v;
    for (const [k, v] of Object.entries(_origActions)) PolicyActionsUtils[k] = v;
    for (const [k, v] of Object.entries(_origMsg)) MessageServer[k] = v;
    for (const k of Object.keys(_origUtils)) delete _origUtils[k];
    for (const k of Object.keys(_origActions)) delete _origActions[k];
    for (const k of Object.keys(_origMsg)) delete _origMsg[k];
}

function captureEvents(block) {
    const events = [];
    block.triggerEvents = async (...a) => { events.push(a); };
    return events;
}

after(() => { restoreStatics(); restoreHarness(); });

describe('@unit exec RequestVcDocumentBlock.getData', () => {
    afterEach(() => restoreStatics());

    function mk(opts = {}, schema = { iri: '#Schema', fields: [{ name: 'a' }], conditions: [{ x: 1 }] }) {
        const { block, db } = makeBlock(RequestVcDocumentBlock, { options: opts.options || {}, ...opts });
        block._schema = schema;
        return { block, db };
    }

    it('returns the block envelope id/blockType/actionType', async () => {
        const { block } = mk({ uuid: 'r1', tag: 'rt' });
        const d = await block.getData(makeUser());
        assert.equal(d.id, 'r1');
        assert.equal(d.blockType, 'requestVcDocumentBlock');
        assert.equal(d.actionType, LocationType.REMOTE);
    });

    it('strips schema fields/conditions into an empty-fields envelope', async () => {
        const { block } = mk({}, { iri: '#S', fields: [{ name: 'x' }], conditions: [{ c: 1 }] });
        const d = await block.getData(makeUser());
        assert.deepEqual(d.schema.fields, []);
        assert.deepEqual(d.schema.conditions, []);
        assert.equal(d.schema.iri, '#S');
    });

    it('is readonly only when REMOTE block AND remote user', async () => {
        const { block } = mk();
        assert.equal((await block.getData(makeUser({ location: LocationType.REMOTE }))).readonly, true);
    });

    it('is not readonly for a local user on a remote block', async () => {
        const { block } = mk();
        assert.equal((await block.getData(makeUser({ location: LocationType.LOCAL }))).readonly, false);
    });

    it('passes through presetSchema / presetFields options', async () => {
        const { block } = mk({ options: { presetSchema: '#Preset', presetFields: [{ name: 'f' }] } });
        const d = await block.getData(makeUser());
        assert.equal(d.presetSchema, '#Preset');
        assert.deepEqual(d.presetFields, [{ name: 'f' }]);
    });

    it('defaults editType to "new" when unset', async () => {
        const d = await mk().block.getData(makeUser());
        assert.equal(d.editType, 'new');
    });

    it('keeps an explicit editType', async () => {
        const d = await mk({ options: { editType: 'edit' } }).block.getData(makeUser());
        assert.equal(d.editType, 'edit');
    });

    it('coerces relayerAccount / enableAdditionalData option to boolean', async () => {
        const d = await mk({ options: { relayerAccount: 'x', enableAdditionalData: 1 } }).block.getData(makeUser());
        assert.equal(d.relayerAccount, true);
        assert.equal(d.enableAdditionalData, true);
    });

    it('relayerAccount/enableAdditionalData false when unset', async () => {
        const d = await mk().block.getData(makeUser());
        assert.equal(d.relayerAccount, false);
        assert.equal(d.enableAdditionalData, false);
    });

    it('defaults uiMetaData to {} and hideFields to []', async () => {
        const d = await mk().block.getData(makeUser());
        assert.deepEqual(d.uiMetaData, {});
        assert.deepEqual(d.hideFields, []);
    });

    it('passes through uiMetaData and hideFields', async () => {
        const d = await mk({ options: { uiMetaData: { title: 'T' }, hideFields: ['h'] } }).block.getData(makeUser());
        assert.deepEqual(d.uiMetaData, { title: 'T' });
        assert.deepEqual(d.hideFields, ['h']);
    });

    it('data is null when there are no source children', async () => {
        const d = await mk().block.getData(makeUser());
        assert.equal(d.data, null);
    });

    it('data takes the first source when sources exist', async () => {
        const { block } = mk();
        block.getSources = async () => [{ id: 'first' }, { id: 'second' }];
        const d = await block.getData(makeUser());
        assert.deepEqual(d.data, { id: 'first' });
    });

    it('restoreData is undefined when no per-user state', async () => {
        const d = await mk().block.getData(makeUser());
        assert.equal(d.restoreData, undefined);
    });

    it('restoreData reflects stored per-user restore payload', async () => {
        const { block } = mk();
        const user = makeUser({ id: 'u-7' });
        block.state['u-7'] = { restoreData: { doc: 1 } };
        const d = await block.getData(user);
        assert.deepEqual(d.restoreData, { doc: 1 });
    });
});

describe('@unit exec RequestVcDocumentBlock.restoreAction', () => {
    afterEach(() => restoreStatics());

    function mk() {
        const { block } = makeBlock(RequestVcDocumentBlock, { options: {} });
        block._schema = { iri: '#S' };
        return block;
    }

    it('no-ops when event has no data', async () => {
        const block = mk();
        await block.restoreAction({ user: makeUser() });
        assert.equal(block.state[makeUser().id], undefined);
    });

    it('no-ops when event has no user', async () => {
        const block = mk();
        await block.restoreAction({ data: { data: { x: 1 } } });
        assert.deepEqual(Object.keys(block.state).filter((k) => k !== 'active'), []);
    });

    it('stores restoreData under a fresh per-user state', async () => {
        const block = mk();
        const user = makeUser({ id: 'u-1' });
        await block.restoreAction({ user, data: { data: { vc: 1 } } });
        assert.deepEqual(block.state['u-1'].restoreData, { vc: 1 });
    });

    it('merges restoreData into an existing per-user state', async () => {
        const block = mk();
        const user = makeUser({ id: 'u-2' });
        block.state['u-2'] = { keep: true };
        await block.restoreAction({ user, data: { data: { vc: 2 } } });
        assert.equal(block.state['u-2'].keep, true);
        assert.deepEqual(block.state['u-2'].restoreData, { vc: 2 });
    });
});

describe('@unit exec RequestVcDocumentBlock.setData validation + preset', () => {
    afterEach(() => restoreStatics());

    function mk(options = {}) {
        const { block, db } = makeBlock(RequestVcDocumentBlock, { options });
        block._schema = { iri: '#S', fields: [], type: 'TestType', contextURL: 'ctx://x' };
        block.tenantContext = { tenantId: 'tenant-1' };
        const events = captureEvents(block);
        return { block, db, events };
    }

    function stubHappyPath() {
        patchUtils({
            getRelationships: async () => null,
            getRelayerAccountAndOwner: async (_ref, user) => [null, user],
            getSubjectId: () => 'subj-1',
            getCredentialSubject: (d) => (d && d.document) || null,
            setAutoCalculateFields: () => {},
            setGuardianVersion: () => {},
            getGroupContext: async () => null,
            getBlockTags: async () => [],
            setDocumentTags: () => {},
            getHederaAccounts: () => ({}),
            createVC: (ref, owner, vc) => ({ owner: owner.did, document: vc, policyId: ref.policyId }),
            setDocumentRef: (item) => item,
        });
        patchActions({
            generateId: async () => null,
            signVC: async ({ subject }) => ({ subject, toCredentialHash: () => 'h', toJsonTree: () => ({}) }),
        });
    }

    it('throws when document is missing (prepareDocument)', async () => {
        const { block } = mk();
        stubHappyPath();
        await assert.rejects(() => block.setData(makeUser(), { document: null }, null, null));
    });

    it('throws when user has no did', async () => {
        const { block } = mk();
        await assert.rejects(
            () => block.setData(makeUser({ did: null }), { document: { a: 1 } }, null, null),
            /did/
        );
    });

    it('deletes restoreData for the user before processing', async () => {
        const { block } = mk();
        const user = makeUser({ id: 'u-r' });
        block.state['u-r'] = { restoreData: { old: 1 } };
        stubHappyPath();
        block.getVcHelperOk = true;
        await assert.rejects(() => block.setData(user, { document: null }, null, null));
        assert.equal(block.state['u-r'].restoreData, undefined);
    });

    it('rejects when readonly preset field was modified', async () => {
        const { block } = mk({ presetSchema: '#P', presetFields: [{ name: 'a', value: 'a', readonly: true }] });
        patchUtils({
            getRelationships: async () => ({ messageId: 'm1', document: { credentialSubject: { a: 'orig' } } }),
            getRelayerAccountAndOwner: async (_r, u) => [null, u],
            getSubjectId: () => 'subj',
            getCredentialSubject: (d) => d.document.credentialSubject,
            setAutoCalculateFields: () => {},
            setGuardianVersion: () => {},
        });
        patchActions({ generateId: async () => null });
        await assert.rejects(
            () => block.setData(makeUser(), { document: { a: 'changed' } }, null, null),
            /readonly|Readonly/i
        );
    });

    it('throws when reference document has no subject id', async () => {
        const { block } = mk();
        patchUtils({
            getRelationships: async () => ({ messageId: 'm1', document: {} }),
            getRelayerAccountAndOwner: async (_r, u) => [null, u],
            getSubjectId: () => null,
            setAutoCalculateFields: () => {},
            setGuardianVersion: () => {},
        });
        patchActions({ generateId: async () => null });
        await assert.rejects(
            () => block.setData(makeUser(), { document: { a: 1 }, ref: 'x' }, null, null),
            /Reference document not found/
        );
    });
});

describe('@unit exec RequestVcDocumentBlockAddon.getData', () => {
    afterEach(() => restoreStatics());

    function mk(options = {}) {
        const { block } = makeBlock(RequestVcDocumentBlockAddon, { options });
        block._schema = { iri: '#Addon', fields: [{ name: 'q' }], conditions: [{ c: 9 }] };
        return block;
    }

    it('returns envelope with id/blockType', async () => {
        const d = await mk().getData(makeUser());
        assert.equal(d.blockType, 'requestVcDocumentBlockAddon');
        assert.equal(d.id, 'uuid-1');
    });

    it('spreads options into the envelope', async () => {
        const d = await mk({ presetSchema: '#P', custom: 42 }).getData(makeUser());
        assert.equal(d.presetSchema, '#P');
        assert.equal(d.custom, 42);
    });

    it('strips schema fields/conditions', async () => {
        const d = await mk().getData(makeUser());
        assert.deepEqual(d.schema.fields, []);
        assert.deepEqual(d.schema.conditions, []);
    });

    it('readonly true for remote user', async () => {
        assert.equal((await mk().getData(makeUser({ location: LocationType.REMOTE }))).readonly, true);
    });

    it('readonly false for local user', async () => {
        assert.equal((await mk().getData(makeUser({ location: LocationType.LOCAL }))).readonly, false);
    });
});

describe('@unit exec RequestVcDocumentBlockAddon.checkPreset', () => {
    afterEach(() => restoreStatics());

    function mk(options = {}) {
        const { block } = makeBlock(RequestVcDocumentBlockAddon, { options });
        block._schema = { iri: '#S' };
        return block;
    }

    it('valid when no presetFields configured', async () => {
        const block = mk();
        const res = await block.checkPreset(block, { a: 1 }, null, makeUser());
        assert.equal(res.valid, true);
    });

    it('valid when presetFields present but no readonly+value entries', async () => {
        const block = mk({ presetSchema: '#P', presetFields: [{ name: 'a', readonly: false }] });
        const res = await block.checkPreset(block, { a: 1 }, { document: { credentialSubject: { a: 1 } } }, makeUser());
        assert.equal(res.valid, true);
    });

    it('valid when documentRef is missing even with readonly fields', async () => {
        const block = mk({ presetSchema: '#P', presetFields: [{ name: 'a', value: 'a', readonly: true }] });
        const res = await block.checkPreset(block, { a: 1 }, null, makeUser());
        assert.equal(res.valid, true);
    });

    it('invalid when preset document cannot be resolved', async () => {
        const block = mk({ presetSchema: '#P', presetFields: [{ name: 'a', value: 'a', readonly: true }] });
        patchUtils({ getCredentialSubject: () => null });
        const res = await block.checkPreset(block, { a: 1 }, { document: {} }, makeUser());
        assert.equal(res.valid, false);
        assert.match(res.error, /can not be verified/);
    });

    it('invalid when a readonly field was changed', async () => {
        const block = mk({ presetSchema: '#P', presetFields: [{ name: 'a', value: 'a', readonly: true }] });
        patchUtils({ getCredentialSubject: () => ({ a: 'orig' }) });
        const res = await block.checkPreset(block, { a: 'changed' }, { document: { credentialSubject: { a: 'orig' } } }, makeUser());
        assert.equal(res.valid, false);
        assert.match(res.error, /can not be modified/);
    });

    it('valid when readonly field is unchanged', async () => {
        const block = mk({ presetSchema: '#P', presetFields: [{ name: 'a', value: 'a', readonly: true }] });
        patchUtils({ getCredentialSubject: () => ({ a: 'same' }) });
        const res = await block.checkPreset(block, { a: 'same' }, { document: { credentialSubject: { a: 'same' } } }, makeUser());
        assert.equal(res.valid, true);
    });
});

describe('@unit exec SendToGuardianBlock.mapDocument', () => {
    afterEach(() => restoreStatics());
    const block = () => makeBlock(SendToGuardianBlock, { options: {} }).block;

    it('copies all non-id keys from new doc onto old', () => {
        const out = block().mapDocument({ keep: 1 }, { foo: 'bar', baz: 2 });
        assert.equal(out.foo, 'bar');
        assert.equal(out.baz, 2);
        assert.equal(out.keep, 1);
    });

    it('does not copy id / _id', () => {
        const out = block().mapDocument({ id: 'OLD', _id: 'OLD2' }, { id: 'NEW', _id: 'NEW2', x: 1 });
        assert.equal(out.id, 'OLD');
        assert.equal(out._id, 'OLD2');
        assert.equal(out.x, 1);
    });

    it('skips function-valued properties', () => {
        const out = block().mapDocument({}, { fn: () => 1, value: 5 });
        assert.equal(out.fn, undefined);
        assert.equal(out.value, 5);
    });

    it('returns the same old reference', () => {
        const old = {};
        assert.equal(block().mapDocument(old, { a: 1 }), old);
    });
});

describe('@unit exec SendToGuardianBlock.getTopicOwner', () => {
    afterEach(() => restoreStatics());
    const block = () => makeBlock(SendToGuardianBlock, { options: {} }).block;

    it('defaults to document.owner', () => {
        assert.equal(block().getTopicOwner({}, { owner: 'did:doc' }, undefined), 'did:doc');
    });

    it('type "user" uses document.owner', () => {
        assert.equal(block().getTopicOwner({}, { owner: 'did:u' }, 'user'), 'did:u');
    });

    it('type "root" uses ref.policyOwner', () => {
        assert.equal(block().getTopicOwner({ policyOwner: 'did:root' }, { owner: 'did:u' }, 'root'), 'did:root');
    });

    it('type "issuer" uses document issuer', () => {
        patchUtils({ getDocumentIssuer: () => 'did:issuer' });
        assert.equal(block().getTopicOwner({}, { owner: 'did:u', document: {} }, 'issuer'), 'did:issuer');
    });

    it('throws when topic owner cannot be resolved', () => {
        assert.throws(() => block().getTopicOwner({}, { owner: null }, 'user'), /Topic owner not found/);
    });
});

describe('@unit exec SendToGuardianBlock VC/DID/VP record lookup', () => {
    afterEach(() => restoreStatics());

    it('getVCRecord queries by draftId when draft', async () => {
        const db = makeDb();
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        await block.getVCRecord({ draft: true, draftId: 'd1' }, 'auto', block);
        const call = db.__calls.find((c) => c.name === 'getVcDocument');
        assert.equal(call.args[0].draft.$eq, true);
        assert.equal(call.args[0].id.$eq, 'd1');
    });

    it('getVCRecord queries by hash (non-revoke) when hash present', async () => {
        const db = makeDb();
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        await block.getVCRecord({ hash: 'H' }, 'auto', block);
        const call = db.__calls.find((c) => c.name === 'getVcDocument');
        assert.equal(call.args[0].hash.$eq, 'H');
        assert.deepEqual(call.args[0].hederaStatus, { $not: { $eq: DocumentStatus.REVOKE } });
    });

    it('getVCRecord returns null without draft/hash', async () => {
        const db = makeDb();
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        assert.equal(await block.getVCRecord({}, 'auto', block), null);
        assert.equal(db.__calls.some((c) => c.name === 'getVcDocument'), false);
    });

    it('getDIDRecord queries by did', async () => {
        const db = makeDb();
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        await block.getDIDRecord({ did: 'did:x' }, 'auto', block);
        const call = db.__calls.find((c) => c.name === 'getVcDocument');
        assert.equal(call.args[0].did.$eq, 'did:x');
    });

    it('getDIDRecord null without did', async () => {
        const db = makeDb();
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        assert.equal(await block.getDIDRecord({}, 'auto', block), null);
    });

    it('getVPRecord queries by hash', async () => {
        const db = makeDb({ getVpDocument: async (q) => ({ q }) });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.getVPRecord({ hash: 'VPH' }, 'auto', block);
        assert.equal(out.q.hash.$eq, 'VPH');
    });

    it('getVPRecord null without hash', async () => {
        const db = makeDb({ getVpDocument: async () => ({}) });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        assert.equal(await block.getVPRecord({}, 'auto', block), null);
    });

    it('getApprovalRecord fetches by id', async () => {
        const db = makeDb({ getApprovalDocument: async (id) => ({ id }) });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.getApprovalRecord({ id: 'A1' }, 'auto', block);
        assert.equal(out.id, 'A1');
    });

    it('getApprovalRecord undefined without id', async () => {
        const db = makeDb({ getApprovalDocument: async () => ({}) });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        assert.equal(await block.getApprovalRecord({}, 'auto', block), undefined);
    });
});

describe('@unit exec SendToGuardianBlock.updateApproval/Did/VP records', () => {
    afterEach(() => restoreStatics());

    it('updateApprovalRecord updates existing approval', async () => {
        const db = makeDb({
            getApprovalDocument: async () => ({ id: 'EXIST', existing: true }),
            updateApproval: async (d) => ({ updated: d }),
        });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.updateApprovalRecord({ id: 'EXIST', newField: 1 }, 'auto', block);
        assert.equal(out.updated.newField, 1);
        assert.equal(out.updated.existing, true);
    });

    it('updateApprovalRecord saves new approval, stripping id/_id', async () => {
        const db = makeDb({
            getApprovalDocument: async () => null,
            saveApproval: async (d) => d,
        });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.updateApprovalRecord({ id: 'X', _id: 'Y', field: 2 }, 'auto', block);
        assert.equal(out.id, undefined);
        assert.equal(out._id, undefined);
        assert.equal(out.field, 2);
    });

    it('updateDIDRecord updates existing did', async () => {
        const db = makeDb({
            getVcDocument: async () => ({ did: 'd', existing: true }),
            updateDid: async (d) => ({ updated: d }),
        });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.updateDIDRecord({ did: 'd', extra: 1 }, 'auto', block);
        assert.equal(out.updated.extra, 1);
    });

    it('updateDIDRecord saves new did when none exists', async () => {
        const db = makeDb({ getVcDocument: async () => null, saveDid: async (d) => d });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.updateDIDRecord({ id: 'I', _id: 'J', did: 'd' }, 'auto', block);
        assert.equal(out.id, undefined);
        assert.equal(out._id, undefined);
    });

    it('updateVPRecord updates existing vp', async () => {
        const db = makeDb({
            getVpDocument: async () => ({ hash: 'h', existing: true }),
            updateVP: async (d) => ({ updated: d }),
        });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.updateVPRecord({ hash: 'h', x: 3 }, 'auto', block);
        assert.equal(out.updated.x, 3);
    });

    it('updateVPRecord saves new vp when none exists', async () => {
        const db = makeDb({ getVpDocument: async () => null, saveVP: async (d) => d });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.updateVPRecord({ id: 'I', _id: 'J', hash: 'h' }, 'auto', block);
        assert.equal(out.id, undefined);
        assert.equal(out._id, undefined);
    });
});

describe('@unit exec SendToGuardianBlock.updateVCRecord', () => {
    afterEach(() => restoreStatics());

    it('updates existing VC via PolicyUtils.updateVC and saves state', async () => {
        const updated = [];
        const states = [];
        patchUtils({
            updateVC: async (_ref, doc) => { updated.push(doc); return doc; },
            saveDocumentState: async (_ref, doc) => { states.push(doc); },
        });
        const db = makeDb({ getVcDocument: async () => ({ hash: 'h', existing: true }) });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.updateVCRecord({ hash: 'h', field: 1 }, 'auto', block, 'uid');
        assert.equal(out.field, 1);
        assert.equal(updated.length, 1);
        assert.equal(states.length, 1);
    });

    it('saves new VC when none exists and strips id/_id', async () => {
        const saved = [];
        patchUtils({
            saveVC: async (_ref, doc) => { saved.push(doc); return doc; },
            saveDocumentState: async () => {},
        });
        const db = makeDb({ getVcDocument: async () => null });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.updateVCRecord({ id: 'I', _id: 'J', hash: 'h' }, 'auto', block, 'uid');
        assert.equal(out.id, undefined);
        assert.equal(out._id, undefined);
        assert.equal(saved.length, 1);
    });

    it('skips saveDocumentState when option skipSaveState is set', async () => {
        const states = [];
        patchUtils({
            saveVC: async (_ref, doc) => doc,
            saveDocumentState: async (_ref, doc) => { states.push(doc); },
        });
        const db = makeDb({ getVcDocument: async () => null });
        const { block } = makeBlock(SendToGuardianBlock, { options: { skipSaveState: true }, componentsOverrides: { databaseServer: db } });
        await block.updateVCRecord({ hash: 'h' }, 'auto', block, 'uid');
        assert.equal(states.length, 0);
    });

    it('drops draftId on existing record when not a draft', async () => {
        let savedOld;
        patchUtils({
            updateVC: async (_ref, doc) => { savedOld = doc; return doc; },
            saveDocumentState: async () => {},
        });
        const db = makeDb({ getVcDocument: async () => ({ hash: 'h', draftId: 'OLD-DRAFT' }) });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        await block.updateVCRecord({ hash: 'h', draftId: 'NEW-DRAFT' }, 'auto', block, 'uid');
        assert.equal(savedOld.draftId, undefined);
    });
});

describe('@unit exec SendToGuardianBlock.updateMessage family', () => {
    afterEach(() => restoreStatics());

    function mk(dbOverrides = {}) {
        const db = makeDb(dbOverrides);
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        return { block, db };
    }

    it('updateMessage routes DID to updateDIDMessage (no old -> seeds messageIds)', async () => {
        const { block } = mk({ getVcDocument: async () => null });
        const out = await block.updateMessage({ messageId: 'm1', did: 'd' }, DocumentType.DID, block, 'uid');
        assert.deepEqual(out.messageIds, ['m1']);
    });

    it('updateMessage routes VC to updateVCMessage and updates the found record', async () => {
        let updated;
        patchUtils({ updateVC: async (_ref, doc) => { updated = doc; } });
        const { block } = mk({ getVcDocument: async () => ({ hash: 'h', messageIds: ['old'] }) });
        const out = await block.updateMessage({ hash: 'h', messageId: 'm2', topicId: 't', messageHash: 'mh' }, DocumentType.VerifiableCredential, block, 'uid');
        assert.equal(updated.messageId, 'm2');
        assert.deepEqual(updated.messageIds, ['old', 'm2']);
        assert.equal(out.messageId, 'm2');
    });

    it('updateVCMessage seeds messageIds when no old record', async () => {
        const { block } = mk({ getVcDocument: async () => null });
        const out = await block.updateMessage({ hash: 'h', messageId: 'm3' }, DocumentType.VerifiableCredential, block, 'uid');
        assert.deepEqual(out.messageIds, ['m3']);
    });

    it('updateMessage routes VP to updateVPMessage', async () => {
        const { block } = mk({ getVpDocument: async () => ({ hash: 'h', messageIds: ['p0'] }), updateVP: async () => {} });
        const out = await block.updateMessage({ hash: 'h', messageId: 'p1' }, DocumentType.VerifiablePresentation, block, 'uid');
        assert.equal(out.messageId, 'p1');
    });

    it('updateMessage returns undefined for an unknown type', async () => {
        const { block } = mk();
        assert.equal(await block.updateMessage({}, 'mystery', block, 'uid'), undefined);
    });
});

describe('@unit exec SendToGuardianBlock.sendByType', () => {
    afterEach(() => restoreStatics());

    function mk(options) {
        const db = makeDb({ getVcDocument: async () => null, saveVP: async (d) => d });
        const { block } = makeBlock(SendToGuardianBlock, { options, componentsOverrides: { databaseServer: db } });
        return { block, db };
    }

    it('vc-documents routes to updateVCRecord', async () => {
        patchUtils({ saveVC: async (_r, d) => ({ via: 'vc', d }), saveDocumentState: async () => {} });
        const { block } = mk({ dataType: 'vc-documents' });
        const out = await block.sendByType({ hash: 'h' }, block, 'uid');
        assert.equal(out.via, 'vc');
    });

    it('did-documents routes to updateDIDRecord', async () => {
        const db = makeDb({ getVcDocument: async () => null, saveDid: async (d) => ({ via: 'did', d }) });
        const { block } = makeBlock(SendToGuardianBlock, { options: { dataType: 'did-documents' }, componentsOverrides: { databaseServer: db } });
        const out = await block.sendByType({ did: 'd' }, block, 'uid');
        assert.equal(out.via, 'did');
    });

    it('approve routes to updateApprovalRecord', async () => {
        const db = makeDb({ getApprovalDocument: async () => null, saveApproval: async (d) => ({ via: 'approve', d }) });
        const { block } = makeBlock(SendToGuardianBlock, { options: { dataType: 'approve' }, componentsOverrides: { databaseServer: db } });
        const out = await block.sendByType({ id: 'x' }, block, 'uid');
        assert.equal(out.via, 'approve');
    });

    it('throws BlockActionError for an unknown dataType', async () => {
        const { block } = mk({ dataType: 'whoknows' });
        await assert.rejects(() => block.sendByType({}, block, 'uid'), /unknown/);
    });

    it('stamps documentFields from the policy cache', async () => {
        patchUtils({ saveVC: async (_r, d) => d, saveDocumentState: async () => {} });
        const { block } = mk({ dataType: 'vc-documents' });
        const out = await block.sendByType({ hash: 'h' }, block, 'uid');
        assert.ok(Array.isArray(out.documentFields));
    });
});

describe('@unit exec SendToGuardianBlock.sendToDatabase', () => {
    afterEach(() => restoreStatics());

    it('sets edited=false and seeds startMessageId from messageId', async () => {
        let saved;
        patchUtils({ saveVC: async (_r, d) => { saved = d; return d; }, saveDocumentState: async () => {} });
        const db = makeDb({ getVcDocument: async () => null });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        await block.sendToDatabase({ hash: 'h', messageId: 'mm' }, DocumentType.VerifiableCredential, block, 'uid');
        assert.equal(saved.edited, false);
        assert.equal(saved.startMessageId, 'mm');
    });

    it('routes DID type to updateDIDRecord', async () => {
        const db = makeDb({ getVcDocument: async () => null, saveDid: async (d) => ({ did: true, d }) });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.sendToDatabase({ did: 'd' }, DocumentType.DID, block, 'uid');
        assert.equal(out.did, true);
    });

    it('routes VP type to updateVPRecord', async () => {
        const db = makeDb({ getVpDocument: async () => null, saveVP: async (d) => ({ vp: true, d }) });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        const out = await block.sendToDatabase({ hash: 'h' }, DocumentType.VerifiablePresentation, block, 'uid');
        assert.equal(out.vp, true);
    });
});

describe('@unit exec SendToGuardianBlock.updateVersion', () => {
    afterEach(() => restoreStatics());

    it('marks old VC edited and updates when it belongs to the policy', async () => {
        let updated;
        patchUtils({ updateVC: async (_ref, doc) => { updated = doc; } });
        const db = makeDb({ getVcDocument: async () => ({ policyId: 'policy-1' }) });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        await block.updateVersion({ id: 'x' }, 'uid');
        assert.equal(updated.edited, true);
    });

    it('does nothing when old VC belongs to another policy', async () => {
        let called = false;
        patchUtils({ updateVC: async () => { called = true; } });
        const db = makeDb({ getVcDocument: async () => ({ policyId: 'other' }) });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        await block.updateVersion({ id: 'x' }, 'uid');
        assert.equal(called, false);
    });

    it('does nothing when no old VC is found', async () => {
        let called = false;
        patchUtils({ updateVC: async () => { called = true; } });
        const db = makeDb({ getVcDocument: async () => null });
        const { block } = makeBlock(SendToGuardianBlock, { options: {}, componentsOverrides: { databaseServer: db } });
        await block.updateVersion({ id: 'x' }, 'uid');
        assert.equal(called, false);
    });
});

describe('@unit exec SendToGuardianBlock.runAction', () => {
    afterEach(() => restoreStatics());

    function mk(options = {}) {
        const { block } = makeBlock(SendToGuardianBlock, { options });
        const events = captureEvents(block);
        const sent = [];
        block.documentSender = async (doc) => { sent.push(doc); return { ...doc, processed: true }; };
        patchUtils({ getBlockTags: async () => [], setDocumentTags: () => {} });
        return { block, events, sent };
    }

    it('processes a single document and triggers Run/Refresh events', async () => {
        const { block, events } = mk();
        const out = await block.runAction({ user: makeUser(), data: { data: { hash: 'h' } } });
        assert.equal(out.data.processed, true);
        const types = events.map((e) => e[0]);
        assert.ok(types.includes('RunEvent'));
        assert.ok(types.includes('RefreshEvent'));
    });

    it('processes an array of documents', async () => {
        const { block, sent } = mk();
        const out = await block.runAction({ user: makeUser(), data: { data: [{ hash: 'a' }, { hash: 'b' }] } });
        assert.equal(sent.length, 2);
        assert.equal(out.data.length, 2);
        assert.ok(out.data.every((d) => d.processed));
    });

    it('updateVersion is invoked for a single old document', async () => {
        const { block } = mk();
        const updated = [];
        block.updateVersion = async (old) => updated.push(old);
        await block.runAction({ user: makeUser(), data: { data: { hash: 'h' }, old: { id: 'o1' } } });
        assert.equal(updated.length, 1);
    });

    it('updateVersion is invoked for each old document in an array', async () => {
        const { block } = mk();
        const updated = [];
        block.updateVersion = async (old) => updated.push(old);
        await block.runAction({ user: makeUser(), data: { data: { hash: 'h' }, old: [{ id: 'o1' }, { id: 'o2' }] } });
        assert.equal(updated.length, 2);
    });

    it('returns event.data', async () => {
        const { block } = mk();
        const ev = { user: makeUser(), data: { data: { hash: 'h' } } };
        const out = await block.runAction(ev);
        assert.equal(out, ev.data);
    });
});

describe('@unit exec RevokeBlock / RevocationBlock helpers', () => {
    afterEach(() => restoreStatics());

    for (const [name, Block] of [['RevokeBlock', RevokeBlock], ['RevocationBlock', RevocationBlock]]) {
        describe(`${name}.findRelatedMessageIds`, () => {
            const mk = () => makeBlock(Block, { options: {} }).block;

            it('throws when the seed topic message is empty', async () => {
                await assert.rejects(() => mk().findRelatedMessageIds(null, []), /empty/);
            });

            it('returns a single entry with undefined parentIds for an isolated message', async () => {
                const out = await mk().findRelatedMessageIds({ id: 'a' }, [{ id: 'a' }]);
                assert.equal(out.length, 1);
                assert.equal(out[0].id, 'a');
                assert.equal(out[0].parentIds, undefined);
            });

            it('walks relationships and records parentIds', async () => {
                const msgs = [
                    { id: 'a', relationships: [] },
                    { id: 'b', relationships: ['a'] },
                    { id: 'c', relationships: ['b'] },
                ];
                const out = await mk().findRelatedMessageIds(msgs[0], msgs);
                const ids = out.map((x) => x.id).sort();
                assert.deepEqual(ids, ['a', 'b', 'c']);
                const b = out.find((x) => x.id === 'b');
                assert.deepEqual(b.parentIds, ['a']);
            });

            it('merges multiple parents for a shared child', async () => {
                const msgs = [
                    { id: 'a', relationships: [] },
                    { id: 'b', relationships: [] },
                    { id: 'c', relationships: ['a', 'b'] },
                ];
                const seed = { id: 'root' };
                msgs.push({ id: 'root', relationships: [] });
                const all = [
                    { id: 'root', relationships: [] },
                    { id: 'a', relationships: ['root'] },
                    { id: 'b', relationships: ['root'] },
                    { id: 'c', relationships: ['a', 'b'] },
                ];
                const out = await mk().findRelatedMessageIds(all[0], all);
                const c = out.find((x) => x.id === 'c');
                assert.deepEqual(c.parentIds.sort(), ['a', 'b']);
            });
        });

        describe(`${name}.findDocumentByMessageIds`, () => {
            it('queries VC/VP/DID with an $in filter and concatenates results', async () => {
                let vcArgs;
                const db = makeDb({
                    getVcDocuments: async (filters, other) => { vcArgs = [filters, other]; return [{ t: 'vc' }]; },
                    getVpDocuments: async () => [{ t: 'vp' }],
                    getDidDocuments: async () => [{ t: 'did' }],
                });
                const { block } = makeBlock(Block, { options: {}, componentsOverrides: { databaseServer: db } });
                const out = await block.findDocumentByMessageIds(['m1', 'm2']);
                assert.deepEqual(out.map((d) => d.t), ['vc', 'vp', 'did']);
                assert.deepEqual(vcArgs[0].messageId.$in, ['m1', 'm2']);
                assert.deepEqual(vcArgs[1].orderBy, { messageId: 'ASC' });
            });

            it('returns empty array when nothing matches', async () => {
                const db = makeDb({
                    getVcDocuments: async () => [],
                    getVpDocuments: async () => [],
                    getDidDocuments: async () => [],
                });
                const { block } = makeBlock(Block, { options: {}, componentsOverrides: { databaseServer: db } });
                assert.deepEqual(await block.findDocumentByMessageIds(['x']), []);
            });
        });
    }
});

describe('@unit exec RevokeBlock.runAction', () => {
    afterEach(() => restoreStatics());

    function fakeMessage(id, relationships, revoked = false) {
        return {
            id,
            relationships,
            _revoked: revoked,
            _revokeArgs: null,
            isRevoked() { return this._revoked; },
            revoke(comment, did, parentIds) { this._revoked = true; this._revokeArgs = { comment, did, parentIds }; },
        };
    }

    function setup(opts = {}) {
        const messages = opts.messages || [fakeMessage('m1', [])];
        const docs = opts.docs || [{ messageId: 'm1', option: {} }];
        const db = makeDb({
            getTopics: async () => [{ topicId: '0.0.9' }],
            getVcDocuments: async () => docs,
            getVpDocuments: async () => [],
            getDidDocuments: async () => [],
        });
        const { block } = makeBlock(RevokeBlock, { options: opts.options || {}, componentsOverrides: { databaseServer: db } });
        const events = captureEvents(block);
        const sent = [];
        patchMsg({ getMessages: async () => messages });
        patchUtils({
            getDocumentRelayerAccount: async () => null,
            updateVC: async () => {},
            saveDocumentState: async () => {},
        });
        patchActions({ sendMessages: async (o) => { sent.push(o); } });
        return { block, events, sent, db, messages };
    }

    it('revokes the target message and sends update messages', async () => {
        const { block, sent, messages } = setup();
        await block.runAction({
            user: makeUser({ did: 'did:revoker' }),
            data: { data: { messageId: 'm1', owner: 'did:o', option: { comment: ['c'] } } },
        });
        assert.equal(messages[0]._revoked, true);
        assert.equal(messages[0]._revokeArgs.did, 'did:revoker');
        assert.equal(sent.length, 1);
        assert.equal(sent[0].messages.length, 1);
    });

    it('takes the first element when data is an array', async () => {
        const { block, messages } = setup();
        await block.runAction({
            user: makeUser({ did: 'd' }),
            data: { data: [{ messageId: 'm1', owner: 'o', option: { comment: [] } }, { messageId: 'zzz' }] },
        });
        assert.equal(messages[0]._revoked, true);
    });

    it('triggers Run and Release events', async () => {
        const { block, events } = setup();
        await block.runAction({
            user: makeUser({ did: 'd' }),
            data: { data: { messageId: 'm1', owner: 'o', option: { comment: [] } } },
        });
        const types = events.map((e) => e[0]);
        assert.ok(types.includes('RunEvent'));
        assert.ok(types.includes('ReleaseEvent'));
    });

    it('stamps Revoked status onto matched documents', async () => {
        const docs = [{ messageId: 'm1', option: {} }];
        const { block } = setup({ docs });
        await block.runAction({
            user: makeUser({ did: 'd' }),
            data: { data: { messageId: 'm1', owner: 'o', option: { comment: ['note'] } } },
        });
        assert.equal(docs[0].option.status, 'Revoked');
    });

    it('still re-revokes the seed message even if already revoked (seed is always added)', async () => {
        const messages = [fakeMessage('m1', [], true)];
        const { block, sent } = setup({ messages });
        await block.runAction({
            user: makeUser({ did: 'd' }),
            data: { data: { messageId: 'm1', owner: 'o', option: { comment: [] } } },
        });
        assert.equal(sent[0].messages.length, 1);
    });

    it('updatePrevDoc updates a previous document status via uiMetaData', async () => {
        const prev = { option: {} };
        const db = makeDb({
            getTopics: async () => [{ topicId: '0.0.9' }],
            getVcDocuments: async (filters) => (filters.messageId.$in.includes('rel-1') ? [prev] : [{ messageId: 'm1', option: {} }]),
            getVpDocuments: async () => [],
            getDidDocuments: async () => [],
        });
        const { block } = makeBlock(RevokeBlock, {
            options: { uiMetaData: { updatePrevDoc: true, prevDocStatus: 'Archived' } },
            componentsOverrides: { databaseServer: db },
        });
        captureEvents(block);
        patchMsg({ getMessages: async () => [fakeMessage('m1', [])] });
        const updatedPrev = [];
        patchUtils({
            getDocumentRelayerAccount: async () => null,
            updateVC: async (_r, d) => updatedPrev.push(d),
            saveDocumentState: async () => {},
        });
        patchActions({ sendMessages: async () => {} });
        await block.runAction({
            user: makeUser({ did: 'd' }),
            data: { data: { messageId: 'm1', owner: 'o', option: { comment: [] }, relationships: ['rel-1'] } },
        });
        assert.equal(updatedPrev.length, 1);
        assert.equal(prev.option.status, 'Archived');
    });
});

describe('@unit exec RevocationBlock.runAction', () => {
    afterEach(() => restoreStatics());

    function fakeMessage(id, relationships, revoked = false) {
        return {
            id,
            relationships,
            _revoked: revoked,
            isRevoked() { return this._revoked; },
            revoke() { this._revoked = true; },
        };
    }

    function setup(options = {}) {
        const docs = [{ messageId: 'm1', option: {} }];
        const db = makeDb({
            getTopics: async () => [{ topicId: '0.0.9' }],
            getVcDocuments: async () => docs,
            getVpDocuments: async () => [],
            getDidDocuments: async () => [],
        });
        const { block } = makeBlock(RevocationBlock, { options, componentsOverrides: { databaseServer: db } });
        const events = captureEvents(block);
        patchMsg({ getMessages: async () => [fakeMessage('m1', [])] });
        patchUtils({
            getDocumentRelayerAccount: async () => null,
            updateVC: async () => {},
            saveDocumentState: async () => {},
        });
        const sent = [];
        patchActions({ sendMessages: async (o) => sent.push(o) });
        return { block, events, sent, docs };
    }

    it('revokes and triggers Run/Release events', async () => {
        const { block, events } = setup();
        await block.runAction({
            user: makeUser({ did: 'd' }),
            data: { data: { messageId: 'm1', owner: 'o', option: { comment: [] } } },
        });
        const types = events.map((e) => e[0]);
        assert.ok(types.includes('RunEvent'));
        assert.ok(types.includes('ReleaseEvent'));
    });

    it('uses block options.updatePrevDoc (not uiMetaData) for the prev-doc branch', async () => {
        const prev = { option: {} };
        const db = makeDb({
            getTopics: async () => [{ topicId: '0.0.9' }],
            getVcDocuments: async (filters) => (filters.messageId.$in.includes('rel-1') ? [prev] : [{ messageId: 'm1', option: {} }]),
            getVpDocuments: async () => [],
            getDidDocuments: async () => [],
        });
        const { block } = makeBlock(RevocationBlock, {
            options: { updatePrevDoc: true, prevDocStatus: 'Reset' },
            componentsOverrides: { databaseServer: db },
        });
        captureEvents(block);
        patchMsg({ getMessages: async () => [fakeMessage('m1', [])] });
        const updated = [];
        patchUtils({
            getDocumentRelayerAccount: async () => null,
            updateVC: async (_r, d) => updated.push(d),
            saveDocumentState: async () => {},
        });
        patchActions({ sendMessages: async () => {} });
        await block.runAction({
            user: makeUser({ did: 'd' }),
            data: { data: { messageId: 'm1', owner: 'o', option: { comment: [] }, relationships: ['rel-1'] } },
        });
        assert.equal(updated.length, 1);
        assert.equal(prev.option.status, 'Reset');
    });

    it('stamps Revoked status onto matched documents', async () => {
        const { block, docs } = setup();
        await block.runAction({
            user: makeUser({ did: 'd' }),
            data: { data: { messageId: 'm1', owner: 'o', option: { comment: ['n'] } } },
        });
        assert.equal(docs[0].option.status, 'Revoked');
    });
});

describe('@unit exec UploadVcDocumentBlock.getData', () => {
    afterEach(() => restoreStatics());

    function mk(options = {}, extra = {}) {
        return makeBlock(UploadVcDocumentBlock, { options, ...extra }).block;
    }

    it('returns id/blockType/actionType envelope', async () => {
        const d = await mk({}, { uuid: 'up-1' }).getData(makeUser());
        assert.equal(d.id, 'up-1');
        assert.equal(d.blockType, 'uploadVcDocumentBlock');
        assert.equal(d.actionType, LocationType.REMOTE);
    });

    it('defaults uiMetaData to {}', async () => {
        const d = await mk().getData(makeUser());
        assert.deepEqual(d.uiMetaData, {});
    });

    it('passes through uiMetaData', async () => {
        const d = await mk({ uiMetaData: { type: 'page' } }).getData(makeUser());
        assert.deepEqual(d.uiMetaData, { type: 'page' });
    });

    it('readonly true for a remote user', async () => {
        assert.equal((await mk().getData(makeUser({ location: LocationType.REMOTE }))).readonly, true);
    });

    it('readonly false for a local user', async () => {
        assert.equal((await mk().getData(makeUser({ location: LocationType.LOCAL }))).readonly, false);
    });
});

describe('@unit exec UploadVcDocumentBlock.setData', () => {
    afterEach(() => restoreStatics());

    function mk(options = {}) {
        const { block } = makeBlock(UploadVcDocumentBlock, { options });
        block.tenantContext = { tenantId: 'tenant-1' };
        const events = captureEvents(block);
        return { block, events };
    }

    it('throws when user has no did', async () => {
        const { block } = mk();
        await assert.rejects(
            () => block.setData(makeUser({ did: null }), { documents: [] }, null, null),
            /did/
        );
    });

    it('verified documents land in retArray, invalid ones in badArray', async () => {
        const { block } = mk({ entityType: 'E', schema: '#S' });
        patchUtils({
            getBlockTags: async () => [],
            setDocumentTags: () => {},
            createVC: (_ref, user, vc) => ({ owner: user.did, document: vc }),
            getErrorMessage: (e) => String(e),
        });
        const goodDoc = { ok: true };
        const badDoc = { ok: false };
        const ret = await runWithStubbedVerification(block, [goodDoc, badDoc], (doc) => doc.ok);
        assert.equal(ret.verified.length, 1);
        assert.equal(ret.invalid.length, 1);
        assert.equal(ret.invalid[0], badDoc);
    });

    it('marks verified docs with VERIFIED signature, schema and entityType', async () => {
        const { block } = mk({ entityType: 'EType', schema: '#Sch' });
        patchUtils({
            getBlockTags: async () => [],
            setDocumentTags: () => {},
            createVC: (_ref, user, vc) => ({ owner: user.did, document: vc }),
            getErrorMessage: (e) => String(e),
        });
        const ret = await runWithStubbedVerification(block, [{ ok: true }], () => true);
        assert.equal(ret.verified[0].signature, DocumentSignature.VERIFIED);
        assert.equal(ret.verified[0].schema, '#Sch');
        assert.equal(ret.verified[0].type, 'EType');
    });

    it('triggers Run/Refresh/Release events', async () => {
        const { block, events } = mk();
        patchUtils({
            getBlockTags: async () => [],
            setDocumentTags: () => {},
            createVC: (_ref, user, vc) => ({ owner: user.did, document: vc }),
            getErrorMessage: (e) => String(e),
        });
        await runWithStubbedVerification(block, [{ ok: true }], () => true);
        const types = events.map((e) => e[0]);
        assert.ok(types.includes('RunEvent'));
        assert.ok(types.includes('RefreshEvent'));
        assert.ok(types.includes('ReleaseEvent'));
    });

    it('all-invalid input yields empty verified list', async () => {
        const { block } = mk();
        patchUtils({
            getBlockTags: async () => [],
            setDocumentTags: () => {},
            getErrorMessage: (e) => String(e),
        });
        const ret = await runWithStubbedVerification(block, [{ ok: false }, { ok: false }], () => false);
        assert.equal(ret.verified.length, 0);
        assert.equal(ret.invalid.length, 2);
    });
});

async function runWithStubbedVerification(block, documents, verifyFn) {
    const origFromJsonTree = VcDocumentRef.fromJsonTree;
    VcDocumentRef.fromJsonTree = (d) => d;
    const origProto = VcHelper.prototype;
    const origVerifySchema = origProto.verifySchema;
    const origVerifyVC = origProto.verifyVC;
    origProto.verifySchema = async function (doc) { return { ok: verifyFn(doc) }; };
    origProto.verifyVC = async function (doc) { return verifyFn(doc); };
    try {
        return await block.setData(makeUser(), { documents }, null, null);
    } finally {
        VcDocumentRef.fromJsonTree = origFromJsonTree;
        origProto.verifySchema = origVerifySchema;
        origProto.verifyVC = origVerifyVC;
    }
}
