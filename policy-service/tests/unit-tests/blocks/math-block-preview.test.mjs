import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';

const firstSubject = (item) => Array.isArray(item.document.credentialSubject)
    ? item.document.credentialSubject[0]
    : item.document.credentialSubject;

describe('@unit mathBlock preview', () => {
    let orig;

    beforeEach(() => {
        orig = {
            findRelationships: PolicyUtils.findRelationships,
            getDocumentOwner: PolicyUtils.getDocumentOwner
        };
        PolicyUtils.findRelationships = async () => [];
        PolicyUtils.getDocumentOwner = async () => ({ did: 'did:owner', group: null });
    });

    afterEach(() => {
        PolicyUtils.findRelationships = orig.findRelationships;
        PolicyUtils.getDocumentOwner = orig.getDocumentOwner;
    });

    after(() => restoreHarness());

    const input = () => ({
        schema: '#in',
        document: PolicyUtils.createVcFromSubject({ amount: 2 }).toJsonTree()
    });

    const refWith = (options) => ({
        blockType: 'mathBlock',
        uuid: 'm-1',
        policyId: 'p-1',
        tag: 'math',
        policyOwner: 'did:policy-owner',
        debugContext: async (context) => context,
        getOptions: async () => options
    });

    const setup = () => {
        const { block } = makeBlock(MathBlock, { options: { onErrorAction: 'no-action' } });
        const stored = [];
        const signed = [];
        block.calculate = async () => ({ total: 4, results: { type: 'table', rows: [{ year: 2020 }] } });
        block.storeResultTables = async (...args) => { stored.push(args); };
        block.createDocument = async (...args) => {
            signed.push(args);
            return { signed: true };
        };
        return { block, stored, signed };
    };

    it('returns an unsigned preview document issued by the policy owner and stores no result table', async () => {
        const { block, stored, signed } = setup();
        const item = await block.process(input(), refWith({ outputSchema: '#out' }), 'uid', 'step-1', makeUser(), [], true);
        assert.equal(stored.length, 0);
        assert.equal(signed.length, 0);
        assert.equal(item.owner, 'did:owner');
        assert.equal(item.document.issuer, 'did:policy-owner');
        assert.equal(item.schema, '#out');
        assert.equal(item.recordActionId, 'step-1');
        assert.equal(item.document.proof, undefined);
        assert.deepEqual(firstSubject(item).results, { type: 'table', rows: [{ year: 2020 }] });
    });

    it('builds the same unsigned document as a normal run when the block is set to unsigned', async () => {
        const { block, stored } = setup();
        const item = await block.process(input(), refWith({ outputSchema: '#out', unsigned: true }), 'uid', 'step-1', makeUser(), [], true);
        assert.equal(stored.length, 0);
        assert.equal(item.owner, undefined);
        assert.equal(item.document.issuer, undefined);
        assert.equal(firstSubject(item).total, 4);
    });

    it('still stores result tables and signs outside a preview', async () => {
        const { block, stored, signed } = setup();
        block.aggregateMetadata = async () => ({});
        await block.process(input(), refWith({ outputSchema: '#out' }), 'uid', null, makeUser(), [], false);
        assert.equal(stored.length, 1);
        assert.equal(signed.length, 1);
    });
});
