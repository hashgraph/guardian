import assert from 'node:assert/strict';
import { PolicyCredential } from '../../../dist/policy-engine/helpers/policy-credential.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import esmock from 'esmock';
import { DidDocumentStatus, LocationType, TopicType } from '@guardian/interfaces';
import { createInMemoryDatabaseHelper } from '../../../../common/tests/helpers/in-memory-database-helper.mjs';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { ComponentsService } from '../../../dist/policy-engine/helpers/components-service.js';
import { GenerateDID } from '../../../dist/policy-engine/policy-actions/generate-did.js';
import { PreviewScope, getPreviewMessages } from '../../../dist/policy-engine/helpers/preview.js';
import { VcHelper } from '@guardian/hedera/vc-helper';
import { SignVC } from '../../../dist/policy-engine/policy-actions/sign-vc.js';

describe('@unit policy credential effect boundary', () => {
    const step = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);
    const did = { getDid: () => 'did:issuer' };

    it('delegates ordinary credential and presentation calls unchanged', async () => {
        const calls = [];
        const helper = {
            createVerifiableCredential: async (...args) => { calls.push(['vc', ...args]); return 'signedVC'; },
            createVerifiablePresentation: async (...args) => { calls.push(['vp', ...args]); return 'signedVP'; },
            createUnsignedCredential: async () => { throw new Error('ordinary call must sign'); },
            createUnsignedPresentation: async () => { throw new Error('ordinary call must sign'); }
        };
        const subject = { type: 'Plot', area: 7 };
        const options = { uuid: 'id1' };
        assert.equal(await PolicyCredential.createVC(helper, subject, did, null, options), 'signedVC');
        assert.equal(await PolicyCredential.createVP(helper, ['vc1'], did, null, options), 'signedVP');
        assert.deepEqual(calls, [['vc', subject, did, null, options], ['vp', ['vc1'], did, null, options]]);
    });

    it('selects unsigned preparation only for the active preview, preserving all options', async () => {
        const calls = [];
        const helper = {
            createUnsignedCredential: async (...args) => { calls.push(['vc', ...args]); return 'preparedVC'; },
            createUnsignedPresentation: async (...args) => { calls.push(['vp', ...args]); return 'preparedVP'; },
            createVerifiableCredential: async () => { throw new Error('must not sign in preview'); },
            createVerifiablePresentation: async () => { throw new Error('must not sign in preview'); }
        };
        const subject = { type: 'Plot', area: 7 };
        const options = { uuid: 'id1', evidence: [{ type: ['Evidence'], dataType: 'text/plain', data: 'x' }] };
        await PreviewScope.run(step(), async () => {
            assert.equal(await PolicyCredential.createVC(helper, subject, did, null, options), 'preparedVC');
            assert.equal(await PolicyCredential.createVP(helper, ['vc1'], did, null, options), 'preparedVP');
        });
        assert.deepEqual(calls, [['vc', subject, 'did:issuer', null, options], ['vp', ['vc1'], options]]);
        assert.equal(PreviewScope.current(), undefined);
    });

    it('uses common envelope construction for a remote issuer without requesting its signature', async () => {
        const schema = VcHelper.getSchemaByContext;
        const credentials = PolicyUtils.getUserCredentials;
        const request = SignVC.request;
        VcHelper.getSchemaByContext = async () => null;
        PolicyUtils.getUserCredentials = async () => { throw new Error('preview must not load remote signing credentials'); };
        SignVC.request = async () => { throw new Error('preview must not request a signature'); };
        try {
            const vc = await PreviewScope.run(step(), () => PolicyActionsUtils.signVC({
                ref: { policyId: 'p1' },
                subject: { '@context': ['ctx:plot'], type: 'Plot', area: 7 },
                issuer: 'did:remote',
                relayerAccount: '0.0.1',
                options: { uuid: 'urn:uuid:1', group: { groupId: 'g1', type: 'Group', context: 'ctx:group' } },
                userId: 'u1'
            }));
            assert.equal(vc.getIssuerDid(), 'did:remote');
            assert.equal(vc.toJsonTree().proof, undefined);
            assert.ok(vc.toJsonTree()['@context'].includes('ctx:group'));
            assert.ok(vc.toJsonTree().type.includes('Group'));
            assert.equal(vc.toJsonTree().credentialSubject[0].area, 7);
        } finally {
            VcHelper.getSchemaByContext = schema;
            PolicyUtils.getUserCredentials = credentials;
            SignVC.request = request;
        }
    });

    it('keeps concurrent ordinary issuance outside the preview scope', async () => {
        const calls = [];
        const helper = {
            createUnsignedCredential: async () => { await Promise.resolve(); calls.push('preview'); return 'preview'; },
            createVerifiableCredential: async () => { calls.push('ordinary'); return 'ordinary'; }
        };
        const result = await Promise.all([
            PreviewScope.run(step(), () => PolicyCredential.createVC(helper, {}, did, null)),
            PolicyCredential.createVC(helper, {}, did, null)
        ]);
        assert.deepEqual(result, ['preview', 'ordinary']);
        assert.deepEqual(calls.sort(), ['ordinary', 'preview']);
    });
});

describe('@unit generated subject ids', () => {
    const step = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);
    const user = { did: 'did:owner', group: 'group-1' };
    const options = (ref, type) => ({ ref, type, user, relayerAccount: '0.0.5', userId: 'user-1' });

    it('makes a public DID record and message visible only inside its preview without accessing a wallet or publisher', async () => {
        const db = createInMemoryDatabaseHelper();
        const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
            '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
        });
        class Topic {}
        class DidDocument {}
        db.seed(Topic, [{ policyId: 'policy-1', type: TopicType.InstancePolicyTopic, topicId: '0.0.123' }]);
        const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
        const credentials = PolicyUtils.getUserCredentials;
        const local = GenerateDID.local;
        const request = GenerateDID.request;
        PolicyUtils.getUserCredentials = async () => { throw new Error('must not access wallet'); };
        GenerateDID.local = async () => { throw new Error('must not publish DID'); };
        GenerateDID.request = async () => { throw new Error('must not request DID publication'); };
        const ref = {
            policyId: 'policy-1', tag: 'request', databaseServer: server,
            components: { generateDID: ComponentsService.prototype.generateDID },
            error: () => {}
        };
        try {
            const current = step();
            const id = await PreviewScope.run(current, async () => {
                const generated = await PolicyActionsUtils.generateId(options(ref, 'DID'), 'action-1');
                assert.match(generated, /^did:hedera:.*_0\.0\.123$/);
                const record = await server.getDidDocument(generated);
                assert.equal(record.did, generated);
                assert.equal(record.document.id, generated);
                assert.equal(record.owner, user.did);
                assert.equal(record.group, user.group);
                assert.equal(record.status, DidDocumentStatus.CREATE);
                assert.equal(record.topicId, '0.0.123');
                assert.ok(Object.keys(record.verificationMethods).length > 0);
                const [message] = getPreviewMessages(current, '0.0.123');
                assert.equal(message.getId(), record.messageId);
                assert.equal(message.getDocument().id, generated);
                assert.equal(JSON.stringify(record).includes('privateKey'), false);
                return generated;
            });
            assert.equal(await server.getDidDocument(id), null);
            await PreviewScope.run(step(), async () => {
                assert.equal(await server.getDidDocument(id), null);
            });
            assert.deepEqual(db.records(DidDocument), []);
            assert.equal(db.calls.some(([name]) => ['save', 'update', 'remove'].includes(name)), false);
        } finally {
            PolicyUtils.getUserCredentials = credentials;
            GenerateDID.local = local;
            GenerateDID.request = request;
        }
    });

    it('keeps UUID, owner and document id dispatch unchanged', async () => {
        const calls = [];
        const ref = { components: { generateUUID: async (...args) => { calls.push(args); return 'uuid-1'; } } };
        for (const run of [callback => callback(), callback => PreviewScope.run(step(), callback)]) {
            assert.equal(await run(() => PolicyActionsUtils.generateId(options(ref, 'OWNER'))), user.did);
            assert.equal(await run(() => PolicyActionsUtils.generateId(options(ref, 'DOCUMENT'))), undefined);
            assert.equal(await run(() => PolicyActionsUtils.generateId(options(ref, 'UUID'), 'action-1')), 'uuid-1');
        }
        assert.deepEqual(calls, [['action-1'], ['action-1']]);
    });

    it('keeps ordinary local DID delegation, batch and action id unchanged', async () => {
        const credentials = PolicyUtils.getUserCredentials;
        const local = GenerateDID.local;
        const calls = [];
        const input = options({}, 'DID');
        const batch = {};
        PolicyUtils.getUserCredentials = async (...args) => { calls.push(['credentials', ...args]); return { location: LocationType.LOCAL }; };
        GenerateDID.local = async (...args) => { calls.push(['local', ...args]); return 'did:ordinary'; };
        try {
            assert.equal(await PolicyActionsUtils.generateId(input, 'action-1', batch), 'did:ordinary');
            assert.deepEqual(calls, [['credentials', input.ref, user.did, 'user-1'], ['local', input, 'action-1', batch]]);
        } finally {
            PolicyUtils.getUserCredentials = credentials;
            GenerateDID.local = local;
        }
    });
});

describe('@unit ordinary remote DID dispatch', () => {
    it('retains request, wait and completion arguments with preview disabled', async () => {
        const credentials = PolicyUtils.getUserCredentials;
        const request = GenerateDID.request;
        const complete = GenerateDID.complete;
        const wait = PolicyActionsUtils.waitRequest;
        const calls = [];
        const input = { ref: {}, type: 'DID', user: { did: 'did:owner' }, userId: 'u1', relayerAccount: '0.0.5' };
        const pending = { id: 'pending-1' };
        const action = { id: 'completed-1' };
        PolicyUtils.getUserCredentials = async () => ({ location: LocationType.REMOTE });
        GenerateDID.request = async (...args) => { calls.push(['request', ...args]); return pending; };
        GenerateDID.complete = async (...args) => { calls.push(['complete', ...args]); return 'did:remote'; };
        PolicyActionsUtils.waitRequest = async (ref, data, userId, callback) => {
            calls.push(['wait', ref, data, userId]);
            return callback(action);
        };
        try {
            assert.equal(await PolicyActionsUtils.generateId(input, 'action-1'), 'did:remote');
            assert.deepEqual(calls, [['request', input], ['wait', input.ref, pending, 'u1'],
                ['complete', action, input.user, 'u1']]);
        } finally {
            PolicyUtils.getUserCredentials = credentials;
            GenerateDID.request = request;
            GenerateDID.complete = complete;
            PolicyActionsUtils.waitRequest = wait;
        }
    });
});
