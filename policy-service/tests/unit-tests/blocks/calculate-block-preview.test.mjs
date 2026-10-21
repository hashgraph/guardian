import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { CalculateContainerBlock } from '../../../dist/policy-engine/blocks/calculate-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

describe('@unit calculateContainerBlock preview', () => {
    let origOwner;

    beforeEach(() => {
        origOwner = PolicyUtils.getDocumentOwner;
        PolicyUtils.getDocumentOwner = async () => ({ did: 'did:owner', group: 'g-1' });
    });

    afterEach(() => {
        PolicyUtils.getDocumentOwner = origOwner;
    });

    after(() => restoreHarness());

    const refWith = (options) => ({
        policyId: 'p-1',
        tag: 'calc',
        blockType: 'calculateContainerBlock',
        uuid: 'c-1',
        policyOwner: 'did:policy-owner',
        debugContext: async (context) => context,
        getOptions: async () => options
    });

    const setup = () => {
        const { block } = makeBlock(CalculateContainerBlock, { options: {} });
        block.calculate = async () => ({ total: 9 });
        block.createDocument = async () => { throw new Error('must not sign in preview'); };
        return block;
    };

    const input = () => ({ schema: '#in', document: PolicyUtils.createVcFromSubject({ a: 1 }).toJsonTree() });

    it('returns an unsigned preview document issued by the policy owner without signing', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const item = await setup().process(input(), refWith({ outputSchema: '#out' }), 'uid', step, makeUser());
        assert.equal(item.owner, 'did:owner');
        assert.equal(item.group, 'g-1');
        assert.equal(item.document.issuer, 'did:policy-owner');
        assert.equal(item.schema, '#out');
        assert.equal(item.recordActionId, step.id);
        assert.equal(item.document.proof, undefined);
    });

    it('keeps the normal unsigned document when the block is set to unsigned', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const item = await setup().process(input(), refWith({ outputSchema: '#out', unsigned: true }), 'uid', step, makeUser());
        assert.equal(item.owner, undefined);
        assert.equal(item.document.issuer, undefined);
    });

    it('records its input fields against the schema of the input document', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const options = { outputSchema: '#out', inputFields: [{ name: 'amount', value: 'a' }] };
        await setup().process(input(), refWith(options), 'uid', step, makeUser());
        assert.deepEqual(step.getPreviewReads(), [{ schema: '#in', path: 'amount' }]);
    });
});
