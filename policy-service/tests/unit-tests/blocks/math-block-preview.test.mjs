import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { getPreviewComputed, getPreviewDocumentSchema, setPreviewComputed } from '../../../dist/policy-engine/helpers/preview.js';

const firstSubject = (item) => Array.isArray(item.document.credentialSubject)
    ? item.document.credentialSubject[0]
    : item.document.credentialSubject;

describe('@unit mathBlock preview', () => {
    let orig;

    beforeEach(() => {
        orig = {
            findRelationships: PolicyUtils.findRelationships,
            getDocumentOwner: PolicyUtils.getDocumentOwner,
            getDocumentRelayerAccount: PolicyUtils.getDocumentRelayerAccount,
            loadSchemaByID: PolicyUtils.loadSchemaByID
        };
        PolicyUtils.findRelationships = async () => [];
        PolicyUtils.getDocumentOwner = async () => ({ did: 'did:owner', group: null });
        PolicyUtils.getDocumentRelayerAccount = async () => '0.0.42';
        PolicyUtils.loadSchemaByID = async (ref, iri) => ({
            iri,
            codeVersion: '1.0.0',
            contextURL: 'schema:ctx',
            document: JSON.stringify({ $id: iri, type: 'object', properties: { total: { type: 'number' } } })
        });
    });

    afterEach(() => {
        PolicyUtils.findRelationships = orig.findRelationships;
        PolicyUtils.getDocumentOwner = orig.getDocumentOwner;
        PolicyUtils.getDocumentRelayerAccount = orig.getDocumentRelayerAccount;
        PolicyUtils.loadSchemaByID = orig.loadSchemaByID;
    });

    after(() => restoreHarness());

    const input = () => ({
        schema: '#in',
        messageId: 'msg-1',
        accounts: { default: '0.0.7' },
        document: PolicyUtils.createVcFromSubject({ amount: 2, id: 'source-id', ref: 'parent-id' }).toJsonTree()
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

    it('keeps the reference, id, policy and links of the input document when it writes another schema', async () => {
        const { block } = setup();
        const item = await block.process(input(), refWith({ outputSchema: '#out' }), 'uid', 'step-1', makeUser(), [], true);
        const subject = firstSubject(item);
        assert.equal(subject.ref, 'parent-id');
        assert.equal(subject.id, 'urn:uuid:source-id');
        assert.equal(subject.policyId, 'p-1');
        assert.equal(subject.total, 4);
        assert.deepEqual(item.relationships, ['msg-1']);
        assert.deepEqual(item.accounts, { default: '0.0.7' });
        assert.equal(item.relayerAccount, '0.0.42');
    });

    it('marks its outputs as computed, adding those of the input document when it writes the same schema', async () => {
        const options = {
            expression: {
                variables: [],
                formulas: [],
                outputs: [{ type: 'link', name: 'b', description: '', field: 'total', schema: '#in' }]
            }
        };
        const source = setPreviewComputed(input(), ['temp']);
        const same = await setup().block.process(source, refWith({ ...options, inputSchema: '#in', outputSchema: '#in' }), 'uid', 'step-1', makeUser(), [], true);
        assert.deepEqual(getPreviewComputed(same), ['temp', 'total', 'results']);
        const other = await setup().block.process(source, refWith({ ...options, inputSchema: '#in', outputSchema: '#out' }), 'uid', 'step-1', makeUser(), [], true);
        assert.deepEqual(getPreviewComputed(other), ['total', 'results']);
    });

    it('builds the same unsigned document as a normal run when the block is set to unsigned', async () => {
        const { block, stored } = setup();
        const item = await block.process(input(), refWith({ outputSchema: '#out', unsigned: true }), 'uid', 'step-1', makeUser(), [], true);
        assert.equal(stored.length, 0);
        assert.equal(item.owner, undefined);
        assert.equal(item.document.issuer, undefined);
        assert.equal(item.schema, undefined);
        assert.equal(firstSubject(item).total, 4);
        assert.equal(getPreviewDocumentSchema(item), '#out');
        assert.deepEqual(getPreviewComputed(item), ['total', 'results']);
    });

    it('gives an unsigned document of the same schema the schema and computed fields of its input', async () => {
        const { block } = setup();
        const source = setPreviewComputed(input(), ['temp']);
        const item = await block.process(source, refWith({ inputSchema: '#in', outputSchema: '#in', unsigned: true }), 'uid', 'step-1', makeUser(), [], true);
        assert.equal(item.schema, undefined);
        assert.equal(getPreviewDocumentSchema(item), '#in');
        assert.deepEqual(getPreviewComputed(item), ['temp', 'total', 'results']);
    });

    it('still stores result tables and signs outside a preview', async () => {
        const { block, stored, signed } = setup();
        block.aggregateMetadata = async () => ({});
        await block.process(input(), refWith({ outputSchema: '#out' }), 'uid', null, makeUser(), [], false);
        assert.equal(stored.length, 1);
        assert.equal(signed.length, 1);
    });
});
