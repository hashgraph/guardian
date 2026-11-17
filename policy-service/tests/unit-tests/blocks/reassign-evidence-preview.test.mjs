import { VcHelper } from '@guardian/hedera/vc-helper';
import { SignVC } from '../../../dist/policy-engine/policy-actions/sign-vc.js';
import { createPreviewDocument } from '../helpers/preview-document-fixture.mjs';
import assert from 'node:assert/strict';
import { ReassigningBlock } from '../../../dist/policy-engine/blocks/reassigning.block.js';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';

const originals = [];
const patch = (target, values) => {
    for (const [key, value] of Object.entries(values)) {
        originals.push([target, key, target[key]]);
        target[key] = value;
    }
};

describe('@unit reassign evidence parity with a following calculation', function () {
    this.timeout(20000);
    beforeEach(() => {
        patch(VcHelper, { getSchemaByContext: async () => null });
        patch(PolicyComponentsUtils, { GetBlockRef: (block) => block, ExternalEventFn: () => undefined });
        patch(PolicyUtils, {
            getDocumentOwner: async () => makeUser(),
            getDocumentRelayerAccount: async () => '0.0.2',
            getUserCredentials: async () => ({ did: 'did:issuer', location: 'local', hederaAccountId: '0.0.2' }),
            getGroupContext: async () => ({ groupId: 'g1', type: 'Group', context: 'ctx:group' }),
            getBlockTags: async () => [],
            loadSchemaByType: async () => ({}),
            getSchemaContext: () => 'ctx:evidence'
        });
        patch(SignVC, {
            local: async ({ subject, issuer, options }) => {
                return await new VcHelper().createUnsignedCredential(subject, issuer, null, options);
            }
        });
    });
    afterEach(() => {
        while (originals.length) {
            const [target, key, value] = originals.pop();
            target[key] = value;
        }
    });
    after(() => restoreHarness());

    it('preserves evidence, its context and group data, and gives a following script the same value', async () => {
        const { block } = makeBlock(ReassigningBlock, {
            options: { issuer: 'owner', actor: 'owner' },
            componentsOverrides: { generateUUID: async () => 'uuid-1' }
        });
        const document = createPreviewDocument({ policyId: 'policy-1' }, makeUser(), { id: 'did:subject', area: 7 }, '#S', 'did:user', null);
        document.document.evidence = [{ type: ['Evidence'], dataType: 'text/plain', data: 'proof-of-area' }];
        const run = async (preview) => {
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, preview);
            const execute = async () => {
                const { item } = await block.documentReassigning(document, makeUser(), null, step);
                const { block: calculation } = makeBlock(CustomLogicBlock, {
                    options: { unsigned: true, expression: 'done({ evidenceCount: documents[0].document.evidence.length });' }
                });
                let output;
                calculation.triggerEvents = async (type, user, data) => {
                    if (type === 'RunEvent') {
                        output = data.data;
                    }
                };
                await calculation.runAction({ user: makeUser(), data: { data: item }, actionStatus: step });
                assert.deepEqual(step.getErrors(), []);
                return { item, value: output.document.credentialSubject[0].evidenceCount };
            };
            return preview ? PreviewScope.run(step, execute) : execute();
        };
        const normal = await run(false);
        const preview = await run(true);
        assert.equal(preview.value, 1);
        assert.equal(preview.value, normal.value);
        assert.deepEqual(preview.item.document.evidence, normal.item.document.evidence);
        assert.deepEqual(preview.item.document.issuer, normal.item.document.issuer);
        assert.deepEqual(preview.item.document.type, normal.item.document.type);
        assert.deepEqual(preview.item.document['@context'], normal.item.document['@context']);
        assert.equal(preview.item.document.proof, undefined);
    });
});
