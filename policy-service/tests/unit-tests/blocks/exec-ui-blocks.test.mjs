import assert from 'node:assert/strict';
import { LocationType } from '@guardian/interfaces';
import {
    makeBlock,
    makeUser,
    makeDb,
    makeComponents,
    makePolicy,
    restoreHarness,
} from './_block-exec-harness.mjs';
import { InformationBlock } from '../../../dist/policy-engine/blocks/information-block.js';
import { ButtonBlock } from '../../../dist/policy-engine/blocks/button-block.js';
import { ButtonBlockAddon } from '../../../dist/policy-engine/blocks/button-block-addon.js';
import { DropdownBlockAddon } from '../../../dist/policy-engine/blocks/dropdown-block-addon.js';
import { PaginationAddon } from '../../../dist/policy-engine/blocks/pagination-addon.js';
import { InterfaceDocumentsSource } from '../../../dist/policy-engine/blocks/documents-source.js';
import { DocumentsSourceAddon } from '../../../dist/policy-engine/blocks/documents-source-addon.js';
import { SelectiveAttributes } from '../../../dist/policy-engine/blocks/selective-attributes-addon.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const _orig = {};
function silenceSideEffects() {
    _orig.ExternalEventFn = PolicyComponentsUtils.ExternalEventFn;
    _orig.BlockUpdateFn = PolicyComponentsUtils.BlockUpdateFn;
    PolicyComponentsUtils.ExternalEventFn = async () => {};
    PolicyComponentsUtils.BlockUpdateFn = () => {};
}
function restoreSideEffects() {
    if (_orig.ExternalEventFn) PolicyComponentsUtils.ExternalEventFn = _orig.ExternalEventFn;
    if (_orig.BlockUpdateFn) PolicyComponentsUtils.BlockUpdateFn = _orig.BlockUpdateFn;
}

function captureEvents(block) {
    const captured = [];
    block.triggerEvents = async (...a) => { captured.push(a); return []; };
    block.triggerEvent = (...a) => { captured.push(a); };
    return captured;
}

function recDb(returns = {}) {
    const calls = [];
    const wrap = (name) => async (...args) => {
        calls.push({ name, args });
        const r = returns[name];
        return typeof r === 'function' ? r(...args) : r;
    };
    const names = [
        'getVcDocuments', 'getDidDocuments', 'getVpDocuments',
        'getApprovalDocuments', 'getVPMintInformation',
    ];
    const db = makeDb();
    db.__calls = calls;
    for (const n of names) db[n] = wrap(n);
    return db;
}

function fakeParent(over = {}) {
    return { uuid: 'parent-1', registerChild() {}, isChildActive() { return true; }, ...over };
}

describe('@unit exec-ui InformationBlock', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    it('getData returns the canonical envelope', async () => {
        const { block } = makeBlock(InformationBlock, {
            uuid: 'info-x',
            options: { uiMetaData: { title: 'T', description: 'D' } },
        });
        const d = await block.getData(makeUser());
        assert.equal(d.id, 'info-x');
        assert.equal(d.blockType, 'informationBlock');
        assert.equal(d.actionType, LocationType.LOCAL);
        assert.deepEqual(d.uiMetaData, { title: 'T', description: 'D' });
    });

    it('getData carries uiMetaData by reference from options', async () => {
        const uiMetaData = { title: 'ref' };
        const { block } = makeBlock(InformationBlock, { options: { uiMetaData } });
        const d = await block.getData(makeUser());
        assert.equal(d.uiMetaData, uiMetaData);
    });

    it('getData uiMetaData is undefined when options has none', async () => {
        const { block } = makeBlock(InformationBlock, { options: {} });
        const d = await block.getData(makeUser());
        assert.equal(d.uiMetaData, undefined);
    });

    it('LOCAL block stays non-readonly for a LOCAL user', async () => {
        const { block } = makeBlock(InformationBlock, { options: {} });
        const d = await block.getData(makeUser({ location: LocationType.LOCAL }));
        assert.equal(d.readonly, false);
    });

    it('LOCAL block stays non-readonly even for a REMOTE user', async () => {
        const { block } = makeBlock(InformationBlock, { options: {} });
        const d = await block.getData(makeUser({ location: LocationType.REMOTE }));
        assert.equal(d.readonly, false);
    });

    it('blockType static equals informationBlock', () => {
        assert.equal(InformationBlock.blockType, 'informationBlock');
    });

    it('about.control is UI and post is false', () => {
        assert.equal(InformationBlock.about.control, 'UI');
        assert.equal(InformationBlock.about.post, false);
        assert.equal(InformationBlock.about.get, true);
    });

    it('getOptions(null) returns the raw options', async () => {
        const { block } = makeBlock(InformationBlock, { options: { a: 1, uiMetaData: {} } });
        const o = await block.getOptions(null);
        assert.deepEqual(o, { a: 1, uiMetaData: {} });
    });

    it('getOptions(user) returns options when no editable settings', async () => {
        const { block } = makeBlock(InformationBlock, { options: { z: 9 } });
        const o = await block.getOptions(makeUser());
        assert.deepEqual(o, { z: 9 });
    });

    it('exposes uuid/tag/options from construction', () => {
        const { block } = makeBlock(InformationBlock, { uuid: 'u', tag: 't', options: { k: 'v' } });
        assert.equal(block.uuid, 'u');
        assert.equal(block.tag, 't');
        assert.deepEqual(block.options, { k: 'v' });
    });

    it('getData id matches the constructed uuid', async () => {
        const { block } = makeBlock(InformationBlock, { uuid: 'id-xyz', options: {} });
        const d = await block.getData(makeUser());
        assert.equal(d.id, 'id-xyz');
    });

    it('getData blockType is always informationBlock regardless of tag', async () => {
        const { block } = makeBlock(InformationBlock, { tag: 'custom', options: {} });
        const d = await block.getData(makeUser());
        assert.equal(d.blockType, 'informationBlock');
    });

    it('about exposes the RunEvent and RefreshEvent inputs', () => {
        assert.ok(Array.isArray(InformationBlock.about.input));
        assert.equal(InformationBlock.about.input.length, 2);
    });
});

describe('@unit exec-ui ButtonBlock', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    it('is a REMOTE actionType block', () => {
        assert.equal(ButtonBlock.blockType, 'buttonBlock');
        const { block } = makeBlock(ButtonBlock, { options: {} });
        assert.equal(block.actionType, LocationType.REMOTE);
    });

    it('getData copies type/uiMetaData/user from options', async () => {
        const { block } = makeBlock(ButtonBlock, {
            options: { type: 'selector', uiMetaData: { x: 1 }, user: 'owner' },
        });
        const d = await block.getData(makeUser());
        assert.equal(d.type, 'selector');
        assert.deepEqual(d.uiMetaData, { x: 1 });
        assert.equal(d.user, 'owner');
    });

    it('getData echoes userId/userDid from the calling user', async () => {
        const { block } = makeBlock(ButtonBlock, { options: {} });
        const d = await block.getData(makeUser({ userId: 'uid-7', did: 'did:abc' }));
        assert.equal(d.userId, 'uid-7');
        assert.equal(d.userDid, 'did:abc');
    });

    it('getData readonly true when REMOTE block + REMOTE user', async () => {
        const { block } = makeBlock(ButtonBlock, { options: {} });
        const d = await block.getData(makeUser({ location: LocationType.REMOTE }));
        assert.equal(d.readonly, true);
    });

    it('getData readonly false when REMOTE block + LOCAL user', async () => {
        const { block } = makeBlock(ButtonBlock, { options: {} });
        const d = await block.getData(makeUser({ location: LocationType.LOCAL }));
        assert.equal(d.readonly, false);
    });

    it('getData id/blockType reflect construction', async () => {
        const { block } = makeBlock(ButtonBlock, { uuid: 'btn-1', options: {} });
        const d = await block.getData(makeUser());
        assert.equal(d.id, 'btn-1');
        assert.equal(d.blockType, 'buttonBlock');
    });

    it('setData fires triggerEvents with the document state and tag', async () => {
        const { block } = makeBlock(ButtonBlock, { options: {} });
        const captured = captureEvents(block);
        const user = makeUser();
        await block.setData(user, { document: { id: 'd1' }, tag: 'go' }, null, null);
        assert.equal(captured.length, 1);
        const [tag, evUser, state] = captured[0];
        assert.equal(tag, 'go');
        assert.equal(evUser, user);
        assert.deepEqual(state, { data: { id: 'd1' } });
    });

    it('setData wraps the document inside state.data', async () => {
        const { block } = makeBlock(ButtonBlock, { options: {} });
        const captured = captureEvents(block);
        const doc = { foo: 'bar' };
        await block.setData(makeUser(), { document: doc, tag: 'submit' }, null, null);
        assert.equal(captured[0][2].data, doc);
    });

    it('setData forwards actionStatus to triggerEvents', async () => {
        const { block } = makeBlock(ButtonBlock, { options: {} });
        const captured = captureEvents(block);
        const status = { id: 'status-1' };
        await block.setData(makeUser(), { document: {}, tag: 'x' }, null, status);
        assert.equal(captured[0][3], status);
    });

    it('setData with undefined document still triggers', async () => {
        const { block } = makeBlock(ButtonBlock, { options: {} });
        const captured = captureEvents(block);
        await block.setData(makeUser(), { document: undefined, tag: 't' }, null, null);
        assert.equal(captured.length, 1);
        assert.deepEqual(captured[0][2], { data: undefined });
    });
});

describe('@unit exec-ui ButtonBlockAddon', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    it('getData spreads options into the envelope', async () => {
        const { block } = makeBlock(ButtonBlockAddon, {
            uuid: 'ba-1',
            options: { name: 'Approve', uiClass: 'btn-primary', dialog: false },
        });
        const d = await block.getData(makeUser());
        assert.equal(d.id, 'ba-1');
        assert.equal(d.blockType, 'buttonBlockAddon');
        assert.equal(d.name, 'Approve');
        assert.equal(d.uiClass, 'btn-primary');
        assert.equal(d.dialog, false);
    });

    it('getData readonly true for REMOTE block + REMOTE user', async () => {
        const { block } = makeBlock(ButtonBlockAddon, { options: {} });
        const d = await block.getData(makeUser({ location: LocationType.REMOTE }));
        assert.equal(d.readonly, true);
    });

    it('getData readonly false for LOCAL user', async () => {
        const { block } = makeBlock(ButtonBlockAddon, { options: {} });
        const d = await block.getData(makeUser({ location: LocationType.LOCAL }));
        assert.equal(d.readonly, false);
    });

    it('getData spread does not override id/blockType/actionType', async () => {
        const { block } = makeBlock(ButtonBlockAddon, {
            uuid: 'keep',
            options: { id: 'should-be-overwritten-first', extra: 1 },
        });
        const d = await block.getData(makeUser());
        assert.equal(d.extra, 1);
        assert.equal(d.id, 'should-be-overwritten-first');
    });

    it('setData (no dialog) calls parent.onAddonEvent with identity handler result', async () => {
        const calls = [];
        const parent = {
            registerChild() {},
            isChildActive() { return true; },
            async onAddonEvent(user, tag, documentId, handler) {
                const doc = { id: documentId, payload: 1 };
                const res = await handler(doc);
                calls.push({ user, tag, documentId, res });
            },
        };
        const { block } = makeBlock(ButtonBlockAddon, {
            tag: 'addon-tag',
            options: { dialog: false },
            parent,
        });
        await block.setData(makeUser(), { documentId: 'doc-9', dialogResult: 'ignored' }, null, null);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].tag, 'addon-tag');
        assert.equal(calls[0].documentId, 'doc-9');
        assert.deepEqual(calls[0].res, { data: { id: 'doc-9', payload: 1 } });
    });

    it('setData (dialog) injects dialogResult at dialogResultFieldPath', async () => {
        let result;
        const parent = {
            registerChild() {},
            isChildActive() { return true; },
            async onAddonEvent(user, tag, documentId, handler) {
                result = await handler({ id: documentId, option: {} });
            },
        };
        const { block } = makeBlock(ButtonBlockAddon, {
            options: {
                dialog: true,
                dialogOptions: { dialogResultFieldPath: 'option.comment' },
            },
            parent,
        });
        await block.setData(makeUser(), { documentId: 'd', dialogResult: 'hello' }, null, null);
        assert.equal(result.data.option.comment, 'hello');
    });

    it('setData (dialog) creates nested path when absent', async () => {
        let result;
        const parent = {
            registerChild() {},
            isChildActive() { return true; },
            async onAddonEvent(user, tag, documentId, handler) {
                result = await handler({ id: documentId });
            },
        };
        const { block } = makeBlock(ButtonBlockAddon, {
            options: {
                dialog: true,
                dialogOptions: { dialogResultFieldPath: 'a.b.c' },
            },
            parent,
        });
        await block.setData(makeUser(), { documentId: 'd', dialogResult: 42 }, null, null);
        assert.equal(result.data.a.b.c, 42);
    });

    it('setData propagates parent.onAddonEvent rejection', async () => {
        const parent = {
            registerChild() {},
            isChildActive() { return true; },
            async onAddonEvent() { throw new Error('addon boom'); },
        };
        const { block } = makeBlock(ButtonBlockAddon, { options: { dialog: false }, parent });
        await assert.rejects(
            () => block.setData(makeUser(), { documentId: 'd' }, null, null),
            /addon boom/
        );
    });
});

describe('@unit exec-ui DropdownBlockAddon', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    it('getData maps sources to {name, optionValue, value}', async () => {
        const { block } = makeBlock(DropdownBlockAddon, {
            uuid: 'dd-1',
            options: { optionName: 'option.label', optionValue: 'option.code', field: 'document.choice' },
        });
        block.getSources = async () => ([
            { id: 'A', option: { label: 'Alpha', code: 'a' } },
            { id: 'B', option: { label: 'Beta', code: 'b' } },
        ]);
        const d = await block.getData(makeUser());
        assert.equal(d.id, 'dd-1');
        assert.equal(d.blockType, 'dropdownBlockAddon');
        assert.deepEqual(d.documents, [
            { name: 'Alpha', optionValue: 'a', value: 'A' },
            { name: 'Beta', optionValue: 'b', value: 'B' },
        ]);
    });

    it('getData spreads options alongside documents', async () => {
        const { block } = makeBlock(DropdownBlockAddon, {
            options: { optionName: 'n', optionValue: 'v', field: 'f', uiClass: 'c' },
        });
        block.getSources = async () => [];
        const d = await block.getData(makeUser());
        assert.equal(d.uiClass, 'c');
        assert.deepEqual(d.documents, []);
    });

    it('getData maps single-segment missing path to undefined name', async () => {
        const { block } = makeBlock(DropdownBlockAddon, {
            options: { optionName: 'missing', optionValue: 'x', field: 'f' },
        });
        block.getSources = async () => ([{ id: 'Z', option: {} }]);
        const d = await block.getData(makeUser());
        assert.equal(d.documents[0].name, undefined);
        assert.equal(d.documents[0].value, 'Z');
    });

    it('getData throws when optionName path traverses through undefined (latent: findOptions has no guard)', async () => {
        const { block } = makeBlock(DropdownBlockAddon, {
            options: { optionName: 'missing.path', optionValue: 'x', field: 'f' },
        });
        block.getSources = async () => ([{ id: 'Z', option: {} }]);
        await assert.rejects(() => block.getData(makeUser()), /Cannot read properties of undefined/);
    });

    it('getData readonly true REMOTE block + REMOTE user', async () => {
        const { block } = makeBlock(DropdownBlockAddon, { options: { optionName: 'a', optionValue: 'b', field: 'c' } });
        block.getSources = async () => [];
        const d = await block.getData(makeUser({ location: LocationType.REMOTE }));
        assert.equal(d.readonly, true);
    });

    it('setData throws when dropdown document is not in sources', async () => {
        const { block } = makeBlock(DropdownBlockAddon, {
            options: { optionName: 'n', optionValue: 'v', field: 'f' },
        });
        block.getSources = async () => ([{ id: 'X' }]);
        await assert.rejects(
            () => block.setData(makeUser(), { documentId: 'd', dropdownDocumentId: 'NOPE' }, null, null),
            /Document doesn't exist in dropdown options/
        );
    });

    it('setData applies the selected optionValue onto field via parent', async () => {
        let result;
        const parent = {
            registerChild() {},
            isChildActive() { return true; },
            async onAddonEvent(user, tag, documentId, handler) {
                result = await handler({ id: documentId, document: {} });
            },
        };
        const { block } = makeBlock(DropdownBlockAddon, {
            options: { optionName: 'name', optionValue: 'option.code', field: 'document.selected' },
            parent,
        });
        block.getSources = async () => ([
            { id: 'sel-1', option: { code: 'CODE-1' } },
        ]);
        await block.setData(makeUser(), { documentId: 'target', dropdownDocumentId: 'sel-1' }, null, null);
        assert.equal(result.data.document.selected, 'CODE-1');
    });

    it('setData finds the matching dropdown doc by id', async () => {
        let documentIdSeen;
        const parent = {
            registerChild() {},
            isChildActive() { return true; },
            async onAddonEvent(user, tag, documentId, handler) {
                documentIdSeen = documentId;
                await handler({ id: documentId, document: {} });
            },
        };
        const { block } = makeBlock(DropdownBlockAddon, {
            options: { optionName: 'n', optionValue: 'option.v', field: 'document.f' },
            parent,
        });
        block.getSources = async () => ([
            { id: 'one', option: { v: '1' } },
            { id: 'two', option: { v: '2' } },
        ]);
        await block.setData(makeUser(), { documentId: 'doc', dropdownDocumentId: 'two' }, null, null);
        assert.equal(documentIdSeen, 'doc');
    });
});

describe('@unit exec-ui PaginationAddon', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    function makePagination(count, over = {}) {
        const holder = { count };
        const parent = {
            registerChild() {},
            getGlobalSources: async () => holder.count,
        };
        const { block } = makeBlock(PaginationAddon, { parent, ...over });
        return { block, holder };
    }

    it('getState seeds default state for a new user', async () => {
        const { block } = makePagination(55, { uuid: 'pg-1', options: {} });
        const s = await block.getState(makeUser({ id: 'u1' }));
        assert.equal(s.id, 'pg-1');
        assert.equal(s.blockType, 'paginationAddon');
        assert.equal(s.itemsPerPage, 10);
        assert.equal(s.page, 0);
        assert.equal(s.size, 55);
    });

    it('getState reuses totalCount from parent getGlobalSources', async () => {
        const { block } = makePagination(7, { options: {} });
        const s = await block.getState(makeUser({ id: 'u2' }));
        assert.equal(s.size, 7);
    });

    it('getState updates size when total changes', async () => {
        const { block, holder } = makePagination(30, { options: {} });
        const user = makeUser({ id: 'u3' });
        await block.getState(user);
        holder.count = 99;
        const s = await block.getState(user);
        assert.equal(s.size, 99);
    });

    it('setState records page/itemsPerPage and refreshes size', async () => {
        const { block } = makePagination(40, { options: {} });
        const user = makeUser({ id: 'u4' });
        await block.setState(user, { size: 0, itemsPerPage: 25, page: 2 });
        const s = await block.getState(user);
        assert.equal(s.itemsPerPage, 25);
        assert.equal(s.page, 2);
        assert.equal(s.size, 40);
    });

    it('resetPagination restores the previous state after setState', async () => {
        const { block } = makePagination(12, { options: {} });
        const user = makeUser({ id: 'u5' });
        await block.getState(user);
        await block.setState(user, { size: 0, itemsPerPage: 5, page: 1 });
        await block.resetPagination(user);
        const s = await block.getState(user);
        assert.equal(s.itemsPerPage, 10);
        assert.equal(s.page, 0);
    });

    it('resetPagination is a no-op without a prior setState', async () => {
        const { block } = makePagination(3, { options: {} });
        const user = makeUser({ id: 'u6' });
        await block.getState(user);
        await block.resetPagination(user);
        const s = await block.getState(user);
        assert.equal(s.page, 0);
    });

    it('getData delegates to getState', async () => {
        const { block } = makePagination(10, { uuid: 'pg-d', options: {} });
        const d = await block.getData(makeUser({ id: 'u7' }));
        assert.equal(d.id, 'pg-d');
        assert.equal(d.itemsPerPage, 10);
    });

    it('setData stores raw data state per user', async () => {
        const { block } = makePagination(8, { options: {} });
        const user = makeUser({ id: 'u8' });
        await block.setData(user, { itemsPerPage: 50, page: 3 });
        const s = await block.getState(user);
        assert.equal(s.itemsPerPage, 50);
        assert.equal(s.page, 3);
    });

    it('per-user state is isolated', async () => {
        const { block } = makePagination(20, { options: {} });
        const a = makeUser({ id: 'a' });
        const b = makeUser({ id: 'b' });
        await block.setState(a, { size: 0, itemsPerPage: 5, page: 4 });
        const sb = await block.getState(b);
        assert.equal(sb.page, 0);
        assert.equal(sb.itemsPerPage, 10);
    });

    it('readonly is false for LOCAL pagination block', async () => {
        const { block } = makePagination(1, { options: {} });
        const d = await block.getState(makeUser({ id: 'ro', location: LocationType.REMOTE }));
        assert.equal(d.actionType, LocationType.LOCAL);
        assert.equal(d.readonly, false);
    });
});

describe('@unit exec-ui DocumentsSourceAddon getFromSource', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    it('throws when filters option is not an array', async () => {
        const db = makeDb();
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: 'nope' },
            componentsOverrides: { databaseServer: db },
        });
        await assert.rejects(
            () => block.getFromSource(makeUser(), null, false, null),
            /filters option must be an array/
        );
    });

    it('vc-documents query injects policyId and reads getVcDocuments', async () => {
        const db = recDb({ getVcDocuments: async () => [{ id: 'v1', option: {} }] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        const out = await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.ok(call);
        assert.equal(call.args[0].policyId, 'policy-1');
        assert.equal(call.args[0].initId.$exists, false);
        assert.equal(out[0].id, 'v1');
    });

    it('tags returned documents with __sourceTag__ from ref.tag', async () => {
        const db = recDb({ getVcDocuments: async () => [{ id: 'v1', option: {} }] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            tag: 'mysource',
            options: { dataType: 'vc-documents', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        const out = await block.getFromSource(makeUser(), null, false, null);
        assert.equal(out[0].__sourceTag__, 'mysource');
    });

    it('onlyOwnDocuments sets owner filter to user.did', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [], onlyOwnDocuments: true },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser({ did: 'did:me' }), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.equal(call.args[0].owner, 'did:me');
    });

    it('onlyAssignDocuments sets assignedTo filter to user.did', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [], onlyAssignDocuments: true },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser({ did: 'did:me' }), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.equal(call.args[0].assignedTo, 'did:me');
    });

    it('hidePreviousVersions sets edited $ne true', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [], hidePreviousVersions: true },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.deepEqual(call.args[0].edited, { $ne: true });
    });

    it('schema option becomes a filter', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [], schema: '#Foo' },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.equal(call.args[0].schema, '#Foo');
    });

    it('equal filter builds a $eq expression on the field', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: {
                dataType: 'vc-documents',
                filters: [{ type: 'equal', field: 'document.status', value: 'OK' }],
            },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.deepEqual(call.args[0]['document.status'], { $eq: 'OK' });
    });

    it('in filter splits comma values into $in array', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: {
                dataType: 'vc-documents',
                filters: [{ type: 'in', field: 'tag', value: 'a,b,c' }],
            },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.deepEqual(call.args[0].tag, { $in: ['a', 'b', 'c'] });
    });

    it('unknown filter type throws BlockActionError', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: {
                dataType: 'vc-documents',
                filters: [{ type: 'bogus', field: 'f', value: 'x' }],
            },
            componentsOverrides: { databaseServer: db },
        });
        await assert.rejects(
            () => block.getFromSource(makeUser(), null, false, null),
            /Unknown filter type/
        );
    });

    it('globalFilters are merged onto the query', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser(), { extra: 'yes' }, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.equal(call.args[0].extra, 'yes');
    });

    it('did-documents uses getDidDocuments without policyId', async () => {
        const db = recDb({ getDidDocuments: async () => [{ id: 'did1', option: {} }] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'did-documents', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        const out = await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getDidDocuments');
        assert.ok(call);
        assert.equal(call.args[0].policyId, undefined);
        assert.equal(out[0].id, 'did1');
    });

    it('approve dataType uses getApprovalDocuments with policyId', async () => {
        const db = recDb({ getApprovalDocuments: async () => [{ id: 'ap1', option: {} }] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'approve', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        const out = await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getApprovalDocuments');
        assert.equal(call.args[0].policyId, 'policy-1');
        assert.equal(out[0].id, 'ap1');
    });

    it('source dataType (non-count) throws because data=0 is iterated (latent bug)', async () => {
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'source', filters: [] },
        });
        await assert.rejects(
            () => block.getFromSource(makeUser(), null, false, null),
            /is not iterable/
        );
    });

    it('source dataType for count returns [] (latent: swapped with non-count)', async () => {
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'source', filters: [] },
        });
        const out = await block.getFromSource(makeUser(), null, true, null);
        assert.deepEqual(out, []);
    });

    it('unknown dataType throws BlockActionError', async () => {
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'mystery', filters: [] },
        });
        await assert.rejects(
            () => block.getFromSource(makeUser(), null, false, null),
            /dataType "mystery" is unknown/
        );
    });

    it('countResult passes through to getVcDocuments as third arg', async () => {
        const db = recDb({ getVcDocuments: async () => 42 });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        const out = await block.getFromSource(makeUser(), null, true, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.equal(call.args[2], true);
        assert.equal(out, 42);
    });

    it('orderDirection option sets otherOptions.orderBy.createDate', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [], orderDirection: 'DESC' },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.deepEqual(call.args[1].orderBy, { createDate: 'DESC' });
    });

    it('orderField + orderDirection set explicit orderBy field', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [], orderField: 'createDate', orderDirection: 'ASC' },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.deepEqual(call.args[1].orderBy, { createDate: 'ASC' });
    });

    it('applies selective attributes to each item.option', async () => {
        const db = recDb({ getVcDocuments: async () => [{ id: 'v', option: { keep: 'k', drop: 'd' } }] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        block.getSelectiveAttributes = () => ([
            { options: { attributes: [{ attributePath: 'keep' }] } },
        ]);
        const out = await block.getFromSource(makeUser(), null, false, null);
        assert.deepEqual(out[0].option, { keep: 'k' });
    });

    it('without selective attributes the option is untouched', async () => {
        const db = recDb({ getVcDocuments: async () => [{ id: 'v', option: { a: 1, b: 2 } }] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        block.getSelectiveAttributes = () => [];
        const out = await block.getFromSource(makeUser(), null, false, null);
        assert.deepEqual(out[0].option, { a: 1, b: 2 });
    });

    it('count result skips selective-attribute post-processing', async () => {
        const db = recDb({ getVcDocuments: async () => 5 });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        const out = await block.getFromSource(makeUser(), null, true, null);
        assert.equal(out, 5);
    });
});

describe('@unit exec-ui DocumentsSourceAddon getFromSourceFilters', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    it('throws when filters is not an array', async () => {
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: {} },
        });
        await assert.rejects(
            () => block.getFromSourceFilters(makeUser(), null),
            /filters option must be an array/
        );
    });

    it('returns a $set block with __sourceTag__ cond using ref.tag', async () => {
        const { block } = makeBlock(DocumentsSourceAddon, {
            tag: 'srcTag',
            options: { dataType: 'vc-documents', filters: [] },
        });
        block.getSelectiveAttributes = () => [];
        const f = await block.getFromSourceFilters(makeUser(), null);
        assert.ok(f.$set);
        assert.equal(f.$set.id.$toString, '$_id');
        assert.equal(f.$set.__sourceTag__.$cond.then, 'srcTag');
    });

    it('adds equal filter expression into the cond', async () => {
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: {
                dataType: 'vc-documents',
                filters: [{ type: 'equal', field: 'status', value: 'OK' }],
            },
        });
        block.getSelectiveAttributes = () => [];
        const f = await block.getFromSourceFilters(makeUser(), null);
        const andClauses = JSON.stringify(f.$set.__sourceTag__.$cond.if.$and);
        assert.ok(andClauses.includes('$status'));
    });

    it('selective attributes add newOption projection', async () => {
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [] },
        });
        block.getSelectiveAttributes = () => ([
            { options: { attributes: [{ attributePath: 'foo' }] } },
        ]);
        const f = await block.getFromSourceFilters(makeUser(), null);
        assert.ok(f.$set.newOption);
        assert.equal(f.$set.newOption.$cond.then.foo, '$option.foo');
    });

    it('unknown filter type throws', async () => {
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: {
                dataType: 'vc-documents',
                filters: [{ type: 'nope', field: 'f', value: 'v' }],
            },
        });
        block.getSelectiveAttributes = () => [];
        await assert.rejects(
            () => block.getFromSourceFilters(makeUser(), null),
            /Unknown filter type/
        );
    });
});

describe('@unit exec-ui DocumentsSourceAddon setData', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    it('stores per-user state and calls BlockUpdateFn on parent', async () => {
        let updated = null;
        PolicyComponentsUtils.BlockUpdateFn = (block, user) => { updated = { block, user }; };
        const parent = fakeParent();
        const { block } = makeBlock(DocumentsSourceAddon, { options: {}, parent });
        const user = makeUser({ id: 'sd-1' });
        await block.setData(user, { orderDirection: 'ASC' });
        assert.equal(updated.block, parent);
        assert.equal(updated.user, user);
        PolicyComponentsUtils.BlockUpdateFn = () => {};
    });
});

describe('@unit exec-ui SelectiveAttributes', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    it('blockType static is selectiveAttributes', () => {
        assert.equal(SelectiveAttributes.blockType, 'selectiveAttributes');
    });

    it('about post and get are both false', () => {
        assert.equal(SelectiveAttributes.about.post, false);
        assert.equal(SelectiveAttributes.about.get, false);
    });

    it('uuid/tag survive construction', () => {
        const { block } = makeBlock(SelectiveAttributes, { uuid: 'sa-1', tag: 'sa-tag', options: {} });
        assert.equal(block.uuid, 'sa-1');
        assert.equal(block.tag, 'sa-tag');
    });

    it('is a REMOTE actionType addon', () => {
        const { block } = makeBlock(SelectiveAttributes, { options: { attributes: [] } });
        assert.equal(block.actionType, LocationType.REMOTE);
    });

    it('exposes the attributes option', () => {
        const attributes = [{ attributePath: 'a.b' }];
        const { block } = makeBlock(SelectiveAttributes, { options: { attributes } });
        assert.deepEqual(block.options.attributes, attributes);
    });

    it('blockClassName is SourceAddon', () => {
        const { block } = makeBlock(SelectiveAttributes, { options: {} });
        assert.equal(block.blockClassName, 'SourceAddon');
    });

    it('about declares no children and Special control', () => {
        assert.equal(SelectiveAttributes.about.children, 'None');
        assert.equal(SelectiveAttributes.about.control, 'Special');
    });
});

describe('@unit exec-ui InterfaceDocumentsSource', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    function configureSource(block, docs, opts = {}) {
        block.getCommonAddons = () => (opts.commonAddons || []);
        block.getFiltersAddons = () => (opts.filterAddons || []);
        block.getGlobalSources = async () => docs;
        block.getDataByAggregationFilters = async () => docs;
        block.getGlobalSourcesFilters = async () => ({ filters: [], dataType: 'vc-documents' });
        block.components = Object.assign(block.components, {
            getPolicyCommentsCount: async () => 0,
        });
        Object.defineProperty(block, 'children', { value: opts.children || [], configurable: true });
    }

    it('getData returns the base envelope with data + uiMetaData', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            uuid: 'ds-1',
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        configureSource(block, [{ id: 'a', document: { id: 'a' } }]);
        const d = await block.getData(makeUser(), 'ds-1', {});
        assert.equal(d.id, 'ds-1');
        assert.equal(d.blockType, 'interfaceDocumentsSourceBlock');
        assert.equal(d.actionType, LocationType.LOCAL);
        assert.equal(d.data.length, 1);
        assert.equal(d.viewHistory, false);
    });

    it('getData attaches commonAddons and filter blocks', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        const filterAddon = { uuid: 'flt', tag: 'flt', options: { uiMetaData: { x: 1 } }, blockType: 'filtersAddon' };
        const commonAddon = { uuid: 'cmn', options: { uiMetaData: {} }, blockType: 'documentsSourceAddon' };
        configureSource(block, [], { filterAddons: [filterAddon], commonAddons: [commonAddon] });
        const d = await block.getData(makeUser(), 'x', {});
        assert.equal(d.blocks[0].id, 'flt');
        assert.equal(d.commonAddons[0].id, 'cmn');
    });

    it('getData computes pagination flags from pagination addon state', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        const pagination = {
            blockType: 'paginationAddon',
            uuid: 'pag',
            options: { uiMetaData: {} },
            async setState() {},
            async getState() { return { page: 1, itemsPerPage: 10, size: 35 }; },
            async resetPagination() {},
        };
        configureSource(block, [], { commonAddons: [pagination] });
        const d = await block.getData(makeUser(), 'x', { page: '1', itemsPerPage: '10' });
        assert.equal(d.page, 1);
        assert.equal(d.pageSize, 10);
        assert.equal(d.totalCount, 35);
        assert.equal(d.hasPreviousPage, true);
        assert.equal(d.hasNextPage, true);
    });

    it('getData hasNextPage false on the last page', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        const pagination = {
            blockType: 'paginationAddon',
            uuid: 'pag',
            options: { uiMetaData: {} },
            async setState() {},
            async getState() { return { page: 3, itemsPerPage: 10, size: 35 }; },
            async resetPagination() {},
        };
        configureSource(block, [], { commonAddons: [pagination] });
        const d = await block.getData(makeUser(), 'x', {});
        assert.equal(d.hasNextPage, false);
        assert.equal(d.hasPreviousPage, true);
    });

    it('getData filterByUUID narrows to a single doc', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        configureSource(block, [
            { id: '1', document: { id: 'u-1' } },
            { id: '2', document: { id: 'u-2' } },
        ]);
        const d = await block.getData(makeUser(), 'x', { filterByUUID: 'u-2' });
        assert.equal(d.data.length, 1);
        assert.equal(d.data[0].document.id, 'u-2');
    });

    it('getData readonly false for LOCAL block', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        configureSource(block, []);
        const d = await block.getData(makeUser({ location: LocationType.REMOTE }), 'x', {});
        assert.equal(d.readonly, false);
    });

    it('getData treats null queryParams as empty', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        configureSource(block, [{ id: 'a', document: { id: 'a' } }]);
        const d = await block.getData(makeUser(), 'x', null);
        assert.equal(d.data.length, 1);
    });

    it('getData sortDirection/sortField populate sortState', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        configureSource(block, []);
        const d = await block.getData(makeUser(), 'x', { sortDirection: 'asc', sortField: 'createDate' });
        assert.equal(d.orderDirection, 'asc');
        assert.equal(d.orderField, 'createDate');
    });

    it('getData adds comments count to each document', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        configureSource(block, [{ id: 'a', document: { id: 'a' } }]);
        block.components.getPolicyCommentsCount = async () => 7;
        const d = await block.getData(makeUser(), 'x', {});
        assert.equal(d.data[0].comments, 7);
    });

    it('setData stores state and triggers no throw', async () => {
        const parent = fakeParent();
        const { block } = makeBlock(InterfaceDocumentsSource, { options: {}, parent });
        await block.setData(makeUser({ id: 'sd' }), { some: 'state' });
        assert.ok(true);
    });

    it('onAddonEvent throws when document not found', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        block.getGlobalSources = async () => [];
        const captured = captureEvents(block);
        await assert.rejects(
            () => block.onAddonEvent(makeUser({ did: 'd-1' }), 'tag', 'missing', async (x) => ({ data: x }), null),
            /Document is not found/
        );
        assert.equal(captured.length, 0);
    });

    it('onAddonEvent runs handler and triggers events when document found', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        block.getGlobalSources = async () => ([{ id: 'doc-1', __sourceTag__: undefined }]);
        const captured = captureEvents(block);
        await block.onAddonEvent(makeUser({ did: 'd-2' }), 'evt', 'doc-1', async (doc) => ({ data: doc }), null);
        assert.equal(captured.length, 1);
        assert.equal(captured[0][0], 'evt');
        assert.equal(captured[0][2].data.id, 'doc-1');
    });
});

describe('@unit exec-ui DocumentsSourceAddon filter operators', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    function runFilter(filter) {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [filter] },
            componentsOverrides: { databaseServer: db },
        });
        return block.getFromSource(makeUser(), null, false, null).then(() => {
            const call = db.__calls.find((c) => c.name === 'getVcDocuments');
            return call.args[0][filter.field];
        });
    }

    it('not_equal builds $ne', async () => {
        assert.deepEqual(await runFilter({ type: 'not_equal', field: 'f', value: 'X' }), { $ne: 'X' });
    });

    it('not_in builds $nin array', async () => {
        assert.deepEqual(await runFilter({ type: 'not_in', field: 'f', value: 'a,b' }), { $nin: ['a', 'b'] });
    });

    it('gt builds $gt', async () => {
        assert.deepEqual(await runFilter({ type: 'gt', field: 'f', value: '5' }), { $gt: '5' });
    });

    it('gte builds $gte', async () => {
        assert.deepEqual(await runFilter({ type: 'gte', field: 'f', value: '5' }), { $gte: '5' });
    });

    it('lt builds $lt', async () => {
        assert.deepEqual(await runFilter({ type: 'lt', field: 'f', value: '5' }), { $lt: '5' });
    });

    it('lte builds $lte', async () => {
        assert.deepEqual(await runFilter({ type: 'lte', field: 'f', value: '5' }), { $lte: '5' });
    });

    it('onlyOwnByGroupDocuments sets group filter to user.group', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [], onlyOwnByGroupDocuments: true },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser({ group: 'g1' }), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.equal(call.args[0].group, 'g1');
    });

    it('onlyAssignByGroupDocuments sets assignedToGroup', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [], onlyAssignByGroupDocuments: true },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser({ group: 'g2' }), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.equal(call.args[0].assignedToGroup, 'g2');
    });

    it('dynamic getFilters values are merged into the query', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        block.getFilters = async () => ({ dyn: 'V' });
        await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.equal(call.args[0].dyn, 'V');
    });

    it('always sets initId $exists false', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [] },
            componentsOverrides: { databaseServer: db },
        });
        await block.getFromSource(makeUser(), null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.deepEqual(call.args[0].initId, { $exists: false });
    });

    it('state orderDirection overrides options orderDirection', async () => {
        const db = recDb({ getVcDocuments: async () => [] });
        const { block } = makeBlock(DocumentsSourceAddon, {
            options: { dataType: 'vc-documents', filters: [], orderDirection: 'ASC' },
            componentsOverrides: { databaseServer: db },
        });
        const user = makeUser({ id: 'st-1' });
        await block.setData(user, { orderDirection: 'DESC', orderField: 'createDate' });
        await block.getFromSource(user, null, false, null);
        const call = db.__calls.find((c) => c.name === 'getVcDocuments');
        assert.deepEqual(call.args[1].orderBy, { createDate: 'DESC' });
    });
});

describe('@unit exec-ui DocumentsSourceAddon getFromSourceFilters branches', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    function makeAddon(options) {
        const { block } = makeBlock(DocumentsSourceAddon, { tag: 'srcTag', options });
        block.getSelectiveAttributes = () => [];
        return block;
    }

    it('onlyOwnDocuments adds an $eq owner clause', async () => {
        const block = makeAddon({ dataType: 'vc-documents', filters: [], onlyOwnDocuments: true });
        const f = await block.getFromSourceFilters(makeUser({ did: 'did:me' }), null);
        const s = JSON.stringify(f.$set.__sourceTag__.$cond.if.$and);
        assert.ok(s.includes('did:me'));
        assert.ok(s.includes('$owner'));
    });

    it('schema option adds $eq schema clause', async () => {
        const block = makeAddon({ dataType: 'vc-documents', filters: [], schema: '#S' });
        const f = await block.getFromSourceFilters(makeUser(), null);
        const s = JSON.stringify(f.$set.__sourceTag__.$cond.if.$and);
        assert.ok(s.includes('$schema'));
    });

    it('globalFilters are appended to the cond clauses', async () => {
        const block = makeAddon({ dataType: 'vc-documents', filters: [] });
        const f = await block.getFromSourceFilters(makeUser(), [{ $eq: ['Z', '$marker'] }]);
        const s = JSON.stringify(f.$set.__sourceTag__.$cond.if.$and);
        assert.ok(s.includes('$marker'));
    });

    it('else branch keeps existing __sourceTag__', async () => {
        const block = makeAddon({ dataType: 'vc-documents', filters: [] });
        const f = await block.getFromSourceFilters(makeUser(), null);
        assert.equal(f.$set.__sourceTag__.$cond.else, '$__sourceTag__');
    });
});

describe('@unit exec-ui ButtonBlockAddon extra envelope', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    it('getData includes hideWhenDiscontinued and dialogOptions from options', async () => {
        const { block } = makeBlock(ButtonBlockAddon, {
            options: {
                name: 'X',
                hideWhenDiscontinued: true,
                dialog: true,
                dialogOptions: { dialogTitle: 'T' },
            },
        });
        const d = await block.getData(makeUser());
        assert.equal(d.hideWhenDiscontinued, true);
        assert.equal(d.dialog, true);
        assert.deepEqual(d.dialogOptions, { dialogTitle: 'T' });
    });

    it('blockType static is buttonBlockAddon', () => {
        assert.equal(ButtonBlockAddon.blockType, 'buttonBlockAddon');
    });
});

describe('@unit exec-ui DropdownBlockAddon extra', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    it('blockType static is dropdownBlockAddon', () => {
        assert.equal(DropdownBlockAddon.blockType, 'dropdownBlockAddon');
    });

    it('getData with no sources yields empty documents', async () => {
        const { block } = makeBlock(DropdownBlockAddon, {
            options: { optionName: 'n', optionValue: 'v', field: 'f' },
        });
        block.getSources = async () => [];
        const d = await block.getData(makeUser({ location: LocationType.LOCAL }));
        assert.deepEqual(d.documents, []);
        assert.equal(d.readonly, false);
    });

    it('getData value comes from document.id', async () => {
        const { block } = makeBlock(DropdownBlockAddon, {
            options: { optionName: 'option.n', optionValue: 'option.v', field: 'f' },
        });
        block.getSources = async () => ([{ id: 'the-id', option: { n: 'N', v: 'V' } }]);
        const d = await block.getData(makeUser());
        assert.equal(d.documents[0].value, 'the-id');
    });
});

describe('@unit exec-ui InterfaceDocumentsSource extra branches', () => {
    after(() => { restoreHarness(); restoreSideEffects(); });
    before(() => silenceSideEffects());

    function configure(block, docs, opts = {}) {
        block.getCommonAddons = () => (opts.commonAddons || []);
        block.getFiltersAddons = () => (opts.filterAddons || []);
        block.getGlobalSources = async () => docs;
        block.getDataByAggregationFilters = async () => docs;
        block.getGlobalSourcesFilters = async () => ({ filters: [], dataType: 'vc-documents' });
        block.components = Object.assign(block.components, { getPolicyCommentsCount: async () => 0 });
        Object.defineProperty(block, 'children', { value: opts.children || [], configurable: true });
    }

    it('blockType static is interfaceDocumentsSourceBlock', () => {
        assert.equal(InterfaceDocumentsSource.blockType, 'interfaceDocumentsSourceBlock');
    });

    it('enableSorting option routes through aggregation path', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: true } },
        });
        let aggCalled = false;
        configure(block, [{ id: 'a', document: { id: 'a' } }]);
        block.getDataByAggregationFilters = async () => { aggCalled = true; return [{ id: 'a', document: { id: 'a' } }]; };
        const d = await block.getData(makeUser(), 'x', {});
        assert.equal(aggCalled, true);
        assert.equal(d.data.length, 1);
    });

    it('no pagination addon leaves pagination flags unset', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        configure(block, []);
        const d = await block.getData(makeUser(), 'x', {});
        assert.equal(d.page, undefined);
        assert.equal(d.totalCount, undefined);
    });

    it('viewHistory true when a history addon is present', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        const history = { blockType: 'historyAddon', uuid: 'h', options: {} };
        configure(block, [], { commonAddons: [history] });
        block.databaseServer.getDocumentStateHistory = async () => [];
        const d = await block.getData(makeUser(), 'x', {});
        assert.equal(d.viewHistory, true);
    });

    it('getData merges uiMetaData props into the envelope', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false, title: 'Docs' } },
        });
        configure(block, []);
        const d = await block.getData(makeUser(), 'x', {});
        assert.equal(d.title, 'Docs');
    });

    it('getData with no docs returns empty data array', async () => {
        const { block } = makeBlock(InterfaceDocumentsSource, {
            options: { uiMetaData: { fields: [], enableSorting: false } },
        });
        configure(block, []);
        const d = await block.getData(makeUser(), 'x', {});
        assert.deepEqual(d.data, []);
    });
});
