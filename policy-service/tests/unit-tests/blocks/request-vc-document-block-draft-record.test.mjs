import assert from 'node:assert/strict';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
import { SendToGuardianBlock } from '../../../dist/policy-engine/blocks/send-to-guardian-block.js';
import { makeBlock, makeUser, makeDb, restoreHarness } from './_block-exec-harness.mjs';

// A draft save answers with the record it stored: its id and the update time the server gave it.
// The form needs both to update the same record next time and to know which autosave belongs to it.

const _origUtils = {};
const _origActions = {};

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
function restoreStatics() {
    for (const [k, v] of Object.entries(_origUtils)) PolicyUtils[k] = v;
    for (const [k, v] of Object.entries(_origActions)) PolicyActionsUtils[k] = v;
    for (const k of Object.keys(_origUtils)) delete _origUtils[k];
    for (const k of Object.keys(_origActions)) delete _origActions[k];
}

after(() => { restoreStatics(); restoreHarness(); });

const CREATED_AT = '2026-11-14T10:00:00.000Z';
const UPDATED_AT = '2026-11-14T10:05:00.000Z';

describe('@unit RequestVcDocumentBlock draft save returns the stored record', () => {
    afterEach(() => restoreStatics());

    /**
     * request block -> DraftEvent -> sendToGuardian (database), with the database faked.
     * The fake saveVC returns a copy, so nothing is written onto the object the request block built.
     */
    function build({ linked = true } = {}) {
        let stored = null;
        const db = makeDb({
            getVcDocument: async (filter) => (stored && filter?.id?.$eq === stored.id ? stored : null),
        });
        const components = { databaseServer: db, generateUUID: async () => 'uuid-1', info() {}, error() {}, warn() {}, debug() {}, debugContext: async () => ({}), debugError() {} };

        const request = makeBlock(RequestVcDocumentBlock, { components, options: {}, uuid: 'request-1' }).block;
        request._schema = { iri: '#S', fields: [], type: 'TestType', contextURL: 'ctx://x' };
        request.tenantContext = { tenantId: 'tenant-1' };

        const send = makeBlock(SendToGuardianBlock, {
            components,
            options: { dataSource: 'database', dataType: 'vc-documents' },
            uuid: 'send-1',
        }).block;
        send.triggerEvents = async () => undefined;
        send.documentSender = async (doc, userId, user) => send.updateVCRecord(doc, 'auto', send, userId, user);

        // What a DraftEvent link does: hand the same state object to the target block.
        request.triggerEvents = async (type, user, state, actionStatus) => {
            if (type === 'DraftEvent' && linked) {
                await send.runAction({ user, data: state, actionStatus });
            }
        };

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
            saveDocumentState: async () => undefined,
            saveVC: async (_ref, doc) => {
                stored = { ...doc, id: 'record-1', _id: 'record-1', createDate: CREATED_AT, updateDate: CREATED_AT };
                return stored;
            },
            updateVC: async (_ref, doc) => {
                stored = { ...doc, updateDate: UPDATED_AT };
                return stored;
            },
        });
        patchActions({
            generateId: async () => null,
            signVC: async ({ subject }) => ({ subject, toCredentialHash: () => 'h', toJsonTree: () => ({}) }),
        });
        return { request, getStored: () => stored };
    }

    it('returns the id and update time of the record a first draft save created', async () => {
        const { request } = build();
        const response = await request.setData(makeUser(), { document: { a: 1 }, draft: true, draftId: null }, null, null);
        assert.deepEqual(response.draftRecord, { id: 'record-1', updateDate: CREATED_AT });
    });

    it('returns the same id and the new update time when the draft is saved again', async () => {
        const { request } = build();
        const user = makeUser();
        await request.setData(user, { document: { a: 1 }, draft: true, draftId: null }, null, null);
        const response = await request.setData(user, { document: { a: 2 }, draft: true, draftId: 'record-1' }, null, null);
        assert.deepEqual(response.draftRecord, { id: 'record-1', updateDate: UPDATED_AT });
    });

    it('returns no stored record when nothing saved the draft', async () => {
        const { request } = build({ linked: false });
        const response = await request.setData(makeUser(), { document: { a: 1 }, draft: true, draftId: null }, null, null);
        assert.equal(response.draftRecord, undefined);
    });
});
