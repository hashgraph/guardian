import { VcHelper } from '@guardian/hedera/vc-helper';
import { SignVC } from '../../../dist/policy-engine/policy-actions/sign-vc.js';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
import { createPreviewDocument } from '../helpers/preview-document-fixture.mjs';
import assert from 'node:assert/strict';
import esmock from 'esmock';
import { ObjectId } from '@mikro-orm/mongodb';
import { createInMemoryDatabaseHelper } from '../../../../common/tests/helpers/in-memory-database-helper.mjs';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PolicyLink } from '../../../dist/policy-engine/interfaces/policy-event.js';
import { EventActor } from '../../../dist/policy-engine/interfaces/policy-event-type.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { SendToGuardianBlock } from '../../../dist/policy-engine/blocks/send-to-guardian-block.js';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { DocumentsSourceAddon } from '../../../dist/policy-engine/blocks/documents-source-addon.js';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';
import { CreateTokenBlock } from '../../../dist/policy-engine/blocks/create-token-block.js';
import { makeBlock, makeComponents, makeUser, restoreHarness } from './_block-exec-harness.mjs';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});

class VcDocument {}
class Topic {}

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
const plot = (area) => createPreviewDocument({ policyId: 'policy-1', tag: 'form' }, null, { id: 'did:plot', type: 'Plot', area }, null, 'did:user', null).document;
const link = (output, source, target) => new PolicyLink('RunEvent', output, source, target, EventActor.EventInitiator, (event) => target.runAction(event));

describe('@unit a preview over the whole chain', () => {
    beforeEach(() => {
        db.reset();
        patch(PolicyComponentsUtils, { GetBlockRef: (block) => block, ExternalEventFn: () => undefined, BlockErrorFn: async () => undefined });
    });
    afterEach(() => restore());
    after(() => restoreHarness());

    it('ends at a token block that waits for the user, without changing its state', async () => {
        const { block } = makeBlock(CreateTokenBlock, { options: { autorun: false, template: 't' } });
        block.state = { tokenNumber: 1 };
        const step = previewStep();
        await block.runAction({ user: makeUser(), data: { data: { id: 'd1' } }, actionStatus: step });
        assert.deepEqual(block.state, { tokenNumber: 1 });
        assert.deepEqual(step.getPreviewDocuments().map((item) => [item.target, item.document]), [['tag-1', { id: 'd1' }]]);
    });

    describe('save, then a sum over the saved documents, then a branch', () => {
        const ID_A = '64b7f0a1c2d3e4f5a6b7c9a1';
        const ID_B = '64b7f0a1c2d3e4f5a6b7c9a2';

        const build = () => {
            const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
            const components = makeComponents({ databaseServer: server, generateUUID: async () => 'urn:uuid:form' });
            const save = makeBlock(SendToGuardianBlock, { uuid: 'save', tag: 'save', options: { dataSource: 'auto', topic: 'root', topicOwner: 'user', skipSaveState: true }, components }).block;
            const sum = makeBlock(CustomLogicBlock, {
                uuid: 'sum',
                tag: 'sum',
                options: {
                    unsigned: true,
                    onErrorAction: 'no-action',
                    expression: 'done({ type: "Total", sum: sources.reduce((total, source) => total + Number(source.document.credentialSubject[0].area), 0) });'
                },
                components
            }).block;
            makeBlock(DocumentsSourceAddon, {
                uuid: 'source',
                tag: 'source',
                parent: sum,
                options: { dataType: 'vc-documents', schema: '#Plot', onlyOwnDocuments: true, filters: [] },
                components
            });
            const branch = makeBlock(SwitchBlock, {
                uuid: 'switch',
                tag: 'switch',
                options: {
                    executionFlow: 'firstTrue',
                    conditions: [
                        { type: 'equal', value: 'sum >= 15', tag: 'high', actor: '' },
                        { type: 'unconditional', tag: 'low', actor: '' }
                    ]
                },
                components
            }).block;
            const request = makeBlock(RequestVcDocumentBlock, {
                uuid: 'form', tag: 'form', options: { schema: '#Plot', idType: 'DOCUMENT' }, components
            }).block;
            request._schema = {
                iri: '#Plot', type: 'Plot', contextURL: 'ctx:plot', codeVersion: '1.0.0',
                fields: [{ name: 'area', type: 'number', isRef: false, isArray: false }],
                searchFields: () => []
            };
            request.sourceLinks.push(link('RunEvent', request, save));
            const taken = [];
            const outcome = (tag) => ({
                uuid: tag,
                tag,
                blockType: 'sendToGuardianBlock',
                policyId: 'policy-1',
                async runAction(event) { taken.push([tag, event.data.data.document.credentialSubject[0].sum]); }
            });
            save.sourceLinks.push(link('RunEvent', save, sum));
            sum.sourceLinks.push(link('RunEvent', sum, branch));
            branch.sourceLinks.push(link('high', branch, outcome('saveHigh')));
            branch.sourceLinks.push(link('low', branch, outcome('saveLow')));
            return { request, taken };
        };

        const seed = () => {
            db.seed(Topic, [{ policyId: 'policy-1', type: 'INSTANCE_POLICY_TOPIC', topicId: '0.0.100' }]);
            db.seed(VcDocument, [
                { _id: new ObjectId(ID_A), policyId: 'policy-1', owner: 'did:user', schema: '#Plot', document: plot(4) },
                { _id: new ObjectId(ID_B), policyId: 'policy-1', owner: 'did:user', schema: '#Plot', document: plot(5) }
            ]);
        };

        const run = async (area, actionStatus) => {
            const { request, taken } = build();
            const user = makeUser();
            const input = { document: { id: 'did:plot', type: 'Plot', area } };
            const execute = () => request.setData(user, input, null, actionStatus);
            if (actionStatus.preview) {
                await PreviewScope.run(actionStatus, execute);
            } else {
                await execute();
            }
            return taken;
        };

        beforeEach(() => {
            patch(VcHelper, { getSchemaByContext: async () => null });
            patch(VcHelper.prototype, { verifySubject: async () => ({ ok: true }) });
            patch(SignVC, {
                local: async ({ subject, issuer, options }) => {
                    const vc = await new VcHelper().createUnsignedCredential(subject, issuer, null, options);
                    vc.setProof({ type: 'Ed25519Signature2018' });
                    return vc;
                },
                request: async () => { throw new Error('unexpected remote signing'); }
            });
            patch(PolicyActionsUtils, { needKey: () => false });
            const send = PolicyActionsUtils.sendMessage;
            patch(PolicyActionsUtils, {
                sendMessage: async (options) => {
                    if (PreviewScope.current()) {
                        return await send(options);
                    }
                    options.message.setId('1700000000.000000009');
                    options.message.setTopicId(options.topic.topicId);
                    return options.message;
                }
            });
            patch(PolicyUtils, {
                getUserCredentials: async (ref, did) => ({ did, hederaAccountId: '0.0.1', location: 'local' }),
                getDocumentRelayerAccount: async () => '0.0.1',
                getUserByIssuer: async () => ({ hederaAccountId: '0.0.1', roleMessage: null }),
                getBlockTags: async () => [],
                encryptVC: async (ref, document) => document,
                getGroupContext: async () => null,
                getRelayerAccountAndOwner: async (_ref, user) => ['0.0.1', user],
                setGuardianVersion: () => {}
            });
        });

        for (const area of [3, 7]) {
            it(`gives the same sum and branch as a normal submit for a new plot of ${area}, and leaves nothing behind`, async () => {
                seed();
                const step = previewStep();
                const preview = await run(area, step);
                assert.deepEqual(step.getErrors(), []);
                assert.deepEqual(db.records(VcDocument).map((item) => item.id), [ID_A, ID_B]);

                const normal = await run(area, new RecordActionStep(() => undefined, 0, true, true));
                assert.equal(db.records(VcDocument).length, 3);
                assert.deepEqual(preview, normal);
                assert.deepEqual(preview, [[4 + 5 + area >= 15 ? 'saveHigh' : 'saveLow', 4 + 5 + area]]);
            });
        }
    });
});
