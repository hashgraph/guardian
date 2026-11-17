import { createPreviewDocument } from '../helpers/preview-document-fixture.mjs';
import assert from 'node:assert/strict';
import esmock from 'esmock';
import { createInMemoryDatabaseHelper } from '../helpers/in-memory-database-helper.mjs';
import { GlobalEventsWriterStream } from '@guardian/common/entity/global-events-writer-stream';
import { NotificationHelper } from '@guardian/common/notification/notification-helper';
import { Users } from '@guardian/common/helpers/users';
import { MessageServer } from '@guardian/hedera/message/message-server';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { ComponentsService } from '../../../dist/policy-engine/helpers/components-service.js';
import { NotificationBlock } from '../../../dist/policy-engine/blocks/notification.block.js';
import { TokenActionBlock } from '../../../dist/policy-engine/blocks/token-action-block.js';
import { SplitBlock } from '../../../dist/policy-engine/blocks/split-block.js';
import { AggregateBlock } from '../../../dist/policy-engine/blocks/aggregate-block.js';
import { GlobalEventsWriterBlock } from '../../../dist/policy-engine/blocks/global-events-writer-block.js';
import { makeBlock, makeComponents, makeDb, makeUser, restoreHarness } from './_block-exec-harness.mjs';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});

class SplitDocuments {}
class AggregateVC {}

const originals = [];
const patch = (target, map) => {
    for (const [key, value] of Object.entries(map)) {
        originals.push([target, key, target[key]]);
        target[key] = value;
    }
};
const restore = () => {
    while (originals.length) {
        const [target, key, value] = originals.pop();
        target[key] = value;
    }
};

const previewStep = () => new RecordActionStep(() => undefined, 0, true, true, undefined, true);
const inPreview = (step, callback) => PreviewScope.run(step, callback);
const vcDocument = (subject) => createPreviewDocument({ policyId: 'policy-1', tag: 't' }, null, { id: 'did:subject', type: 'Plot', ...subject }, null, 'did:user', null).document;
const wrappedServer = () => createPreviewDatabaseServer(new DatabaseServer(null), null);
const captureEvents = (block) => {
    const events = [];
    block.triggerEvents = async (type, user, data) => { events.push({ type, data }); };
    return events;
};

describe('@unit writing blocks in a preview', () => {
    beforeEach(() => {
        db.reset();
        patch(PolicyComponentsUtils, { GetBlockRef: (block) => block, ExternalEventFn: () => undefined });
    });
    afterEach(() => restore());
    after(() => restoreHarness());

    describe('components generateUUID', () => {
        const service = () => {
            const calls = [];
            const target = Object.create(ComponentsService.prototype);
            target._recordingController = { generateUUID: async (uuid) => { calls.push(['record', uuid]); } };
            target._runningController = null;
            return { target, calls };
        };

        it('gives a new UUID in a preview without recording it', async () => {
            const { target, calls } = service();
            const uuid = await inPreview(previewStep(), () => target.generateUUID('step-1'));
            assert.match(uuid, /^[0-9a-f-]{36}$/);
            assert.deepEqual(calls, []);
        });

        it('takes no UUID from a running test replay in a preview', async () => {
            const { target } = service();
            target._runningController = { nextUUID: async () => { throw new Error('must not consume the replay'); } };
            const uuid = await inPreview(previewStep(), () => target.generateUUID('step-1'));
            assert.match(uuid, /^[0-9a-f-]{36}$/);
        });

        it('still records the UUID outside a preview', async () => {
            const { target, calls } = service();
            const uuid = await target.generateUUID('step-1');
            assert.deepEqual(calls, [['record', uuid]]);
        });
    });

    describe('notification', () => {
        const setup = () => {
            const sent = [];
            patch(NotificationHelper, { info: async (title, message, userId) => { sent.push(userId); } });
            patch(Users.prototype, { getUserById: async (did) => ({ id: `id-${did}`, did }) });
            const { block } = makeBlock(NotificationBlock, { options: { type: 'INFO', user: 'OWNER', title: 'T', message: 'M' } });
            const events = captureEvents(block);
            return { block, events, sent };
        };

        it('sends nothing in a preview and passes the document on', async () => {
            const { block, events, sent } = setup();
            const step = previewStep();
            await inPreview(step, () => block.runAction({ user: makeUser(), data: { data: { id: 'd1' } }, actionStatus: step }));
            assert.deepEqual(sent, []);
            assert.deepEqual(events[0], { type: 'RunEvent', data: { data: { id: 'd1' } } });
        });

        it('sends the notification outside a preview', async () => {
            const { block, sent } = setup();
            await block.runAction({ user: makeUser(), data: { data: { id: 'd1' } } });
            assert.deepEqual(sent, ['id-did:owner']);
        });
    });

    describe('token action', () => {
        const setup = () => {
            const frozen = [];
            patch(PolicyUtils, {
                getDocumentRelayerAccount: async () => '0.0.5',
                getUserCredentials: async () => ({ loadHederaCredentials: async () => ({ hederaAccountId: '0.0.1' }) }),
                freeze: async (ref, token, account) => { frozen.push(account.hederaAccountId); }
            });
            const { block } = makeBlock(TokenActionBlock, {
                options: { action: 'freeze', tokenId: '0.0.9' },
                componentsOverrides: { databaseServer: makeDb({ getToken: async () => ({ tokenId: '0.0.9', enableFreeze: true }), getVirtualHederaAccountInfo: async () => ({ '0.0.9': { frozen: false, kyc: null } }) }) }
            });
            block._dryRun = 'policy-1';
            const events = captureEvents(block);
            return { block, events, frozen };
        };

        it('reads the token and the credentials but freezes nothing in a preview', async () => {
            const { block, events, frozen } = setup();
            const step = previewStep();
            await inPreview(step, () => block.runAction({ user: makeUser(), data: { data: { owner: 'did:user' } }, actionStatus: step }));
            assert.deepEqual(step.getErrors(), []);
            assert.deepEqual(frozen, []);
            assert.equal(events[0].type, 'RunEvent');
        });

        it('freezes the account outside a preview', async () => {
            const { block, frozen } = setup();
            await block.runAction({ user: makeUser(), data: { data: { owner: 'did:user' } } });
            assert.deepEqual(frozen, ['0.0.5']);
        });
    });

    describe('split', () => {
        it('splits with the stored remainder, keeps the new remainder in the preview only, and signs nothing', async () => {
            const server = wrappedServer();
            db.seed(SplitDocuments, [{ policyId: 'policy-1', blockId: 'uuid-1', userId: 'did:user', value: 4, document: { owner: 'did:user', document: vcDocument({ amount: 4 }) } }]);
            patch(PolicyUtils, {
                getUserCredentials: async () => ({ loadDidDocument: async () => { throw new Error('must not load a signing key in a preview'); } })
            });
            const { block } = makeBlock(SplitBlock, {
                options: { threshold: '10', sourceField: 'document.credentialSubject.0.amount' },
                components: makeComponents({ databaseServer: server, generateUUID: async () => 'urn:uuid:chunk' })
            });
            Object.defineProperty(block, 'vcHelper', {
                value: { issueVerifiableCredential: async () => { throw new Error('must not sign in a preview'); } }
            });
            const events = captureEvents(block);
            const step = previewStep();
            const document = { policyId: 'policy-1', owner: 'did:user', document: vcDocument({ amount: 9 }) };
            const residue = await inPreview(step, async () => {
                await block.runAction({ user: makeUser(), data: { data: document }, actionStatus: step });
                return await server.getResidue('policy-1', 'uuid-1', 'did:user');
            });
            assert.deepEqual(step.getErrors(), []);
            const chunks = events.filter((event) => event.type === 'RunEvent').map((event) => event.data.data.map((item) => item.document.credentialSubject[0].amount));
            assert.deepEqual(chunks, [[4, 6]]);
            assert.deepEqual(residue.map((item) => item.value), [3]);
            assert.deepEqual(db.records(SplitDocuments).map((item) => item.value), [4]);
        });

        const splitBlock = () => {
            let next = 0;
            const { block } = makeBlock(SplitBlock, {
                options: { threshold: '10', sourceField: 'document.credentialSubject.0.amount' },
                components: makeComponents({ databaseServer: wrappedServer(), generateUUID: async () => `urn:uuid:chunk-${++next}` })
            });
            Object.defineProperty(block, 'vcHelper', {
                value: {
                    issueVerifiableCredential: async (vc, didDocument, signatureType, options) => {
                        vc.setId(options.uuid);
                        vc.setProof({ type: 'Ed25519Signature2018' });
                        return vc;
                    }
                }
            });
            const credential = vcDocument({ amount: 25 });
            credential.id = 'urn:uuid:original';
            return { block, document: { policyId: 'policy-1', owner: 'did:user', document: credential } };
        };

        it('gives every preview chunk a fresh ID and an issuance date and leaves it unsigned', async () => {
            patch(PolicyUtils, {
                getUserCredentials: async () => ({ loadDidDocument: async () => { throw new Error('must not load a signing key in a preview'); } })
            });
            const { block, document } = splitBlock();
            const events = captureEvents(block);
            const step = previewStep();
            await inPreview(step, () => block.runAction({ user: makeUser(), data: { data: document }, actionStatus: step }));
            assert.deepEqual(step.getErrors(), []);
            const chunks = events.filter((event) => event.type === 'RunEvent').flatMap((event) => event.data.data.map((item) => item.document));
            assert.deepEqual(chunks.map((item) => item.credentialSubject[0].amount), [10, 10]);
            assert.deepEqual(chunks.map((item) => item.id), ['urn:uuid:chunk-1', 'urn:uuid:chunk-2']);
            assert.ok(chunks.every((item) => item.issuanceDate && !item.proof));
        });

        it('prepares a preview chunk like an ordinary chunk apart from the signature', async () => {
            const root = { loadDidDocument: async () => ({}) };
            const prepare = async (preview) => {
                const { block, document } = splitBlock();
                const make = async () => [
                    await block.createNewDoc(block, root, document, 10, 1, 3, 25, 10, 'uid', null, makeUser()),
                    await block.createNewDoc(block, root, document, 10, 2, 3, 25, 10, 'uid', null, makeUser())
                ];
                return preview ? await inPreview(previewStep(), make) : await make();
            };
            const preview = await prepare(true);
            const ordinary = await prepare(false);
            assert.deepEqual(preview.map((item) => item.document.id), ordinary.map((item) => item.document.id));
            assert.equal(new Set(preview.map((item) => item.document.id)).size, 2);
            assert.ok(preview.every((item) => !item.document.proof));
            assert.ok(ordinary.every((item) => item.document.proof));
        });
    });

    describe('aggregate in cumulative mode', () => {
        const setup = () => {
            const server = wrappedServer();
            db.seed(AggregateVC, [{ policyId: 'policy-1', blockId: 'uuid-1', owner: 'did:user', document: vcDocument({ area: 6 }) }]);
            patch(PolicyUtils, { getDocumentOwner: async () => makeUser() });
            const { block } = makeBlock(AggregateBlock, {
                options: {
                    aggregateType: 'cumulative',
                    expressions: [{ name: 'area', value: 'area' }],
                    condition: 'sum(area) >= 10',
                    disableUserGrouping: false
                },
                components: makeComponents({ databaseServer: server })
            });
            const events = captureEvents(block);
            return { server, block, events };
        };

        it('passes the collected documents on in the same preview when the condition holds', async () => {
            const { server, block, events } = setup();
            const step = previewStep();
            const left = await inPreview(step, async () => {
                await block.runAction({ user: makeUser(), data: { data: { policyId: 'policy-1', owner: 'did:user', document: vcDocument({ area: 5 }) } }, actionStatus: step });
                return await server.getAggregateDocuments('policy-1', 'uuid-1');
            });
            const run = events.find((event) => event.type === 'RunEvent');
            assert.deepEqual(run.data.data.map((item) => item.document.credentialSubject[0].area), [6, 5]);
            assert.deepEqual(left, []);
            assert.equal(db.records(AggregateVC).length, 1);
        });

        it('waits, as a normal submit does, when the condition does not hold', async () => {
            const { block, events } = setup();
            const step = previewStep();
            await inPreview(step, () => block.runAction({ user: makeUser(), data: { data: { policyId: 'policy-1', owner: 'did:user', document: vcDocument({ area: 1 }) } }, actionStatus: step }));
            assert.equal(events.some((event) => event.type === 'RunEvent'), false);
            assert.equal(db.records(AggregateVC).length, 1);
        });

        it('waits in period mode', async () => {
            const { block, events } = setup();
            block.options.aggregateType = 'period';
            const step = previewStep();
            await inPreview(step, () => block.runAction({ user: makeUser(), data: { data: { policyId: 'policy-1', owner: 'did:user', document: vcDocument({ area: 50 }) } }, actionStatus: step }));
            assert.equal(events.some((event) => event.type === 'RunEvent'), false);
            assert.equal(db.records(AggregateVC).length, 1);
        });
    });

    describe('global events writer', () => {
        it('runs default stream creation and stream updates without a lasting write', async () => {
            patch(PolicyUtils, {
                getUserCredentials: async () => ({ loadRelayerAccount: async () => ({ hederaAccountId: '0.0.1', hederaAccountKey: 'key', signOptions: null }) })
            });
            patch(MessageServer.prototype, { sendMessage: async () => { throw new Error('must not publish'); } });
            const server = wrappedServer();
            const { block } = makeBlock(GlobalEventsWriterBlock, {
                options: { topicIds: [{ topicId: '0.0.77', documentType: 'any', active: true }] },
                components: makeComponents({ databaseServer: server })
            });
            block.defaultActive = false;
            await inPreview(previewStep(), async () => {
                await block.runAction({ user: makeUser({ userId: 'u1' }), data: { data: { messageId: '1.000000001', topicId: '0.0.1', document: { '@context': [], type: [] } } }, actionStatus: previewStep() });
                const rows = await server.getGlobalEventsWriterStreamsByUser('policy-1', block.uuid, 'u1');
                assert.equal(rows.length, 1);
                assert.equal(rows[0].lastPublishMessageId, '1.000000001');
            });
            assert.deepEqual(db.records(GlobalEventsWriterStream), []);
        });

        for (const preview of [true, false]) {
            it(`records its wait with defaultActive only in a preview: preview=${preview}`, async () => {
                patch(PolicyUtils, {
                    getUserCredentials: async () => ({ loadRelayerAccount: async () => ({ hederaAccountId: '0.0.1', hederaAccountKey: 'key', signOptions: null }) })
                });
                patch(MessageServer.prototype, { sendMessage: async () => { throw new Error('must not publish'); } });
                const server = wrappedServer();
                const { block } = makeBlock(GlobalEventsWriterBlock, {
                    options: { topicIds: [{ topicId: '0.0.77', documentType: 'any', active: false }] },
                    components: makeComponents({ databaseServer: server })
                });
                block.defaultActive = true;
                const outputs = [];
                block.triggerEvents = async (type) => { outputs.push(type); };
                const step = new RecordActionStep(() => {}, 0, true, true, undefined, preview);
                const data = { data: { messageId: '1.000000001', topicId: '0.0.1', document: { '@context': [], type: [] } } };
                const run = () => block.runAction({ user: makeUser({ userId: 'u1' }), data, actionStatus: step });
                await (preview ? inPreview(step, run) : run());
                assert.deepEqual(outputs, []);
                assert.deepEqual(step.getPreviewDocuments(), preview ? [
                    { source: null, target: block.tag, blockType: 'globalEventsWriterBlock', document: data.data }
                ] : []);
            });
        }

        it('publishes nothing in a preview', async () => {
            patch(PolicyUtils, {
                getUserCredentials: async () => ({ loadRelayerAccount: async () => ({ hederaAccountId: '0.0.1', hederaAccountKey: 'key', signOptions: null }) })
            });
            patch(MessageServer.prototype, { sendMessage: async () => { throw new Error('must not publish in a preview'); } });
            const { block } = makeBlock(GlobalEventsWriterBlock, { options: {} });
            await inPreview(previewStep(), () => block.publish(block, makeUser({ hederaAccountId: '0.0.1' }), '0.0.77', { documentType: 'any' }));
        });
    });
});
