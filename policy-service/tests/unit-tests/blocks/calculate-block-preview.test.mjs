import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { installCredentialPreparation } from '../helpers/credential-preparation-stubs.mjs';
import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { CalculateContainerBlock } from '../../../dist/policy-engine/blocks/calculate-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { getPreviewComputed, getPreviewDocumentSchema, setPreviewComputed, setPreviewDocumentSchema } from '../../../dist/policy-engine/helpers/preview.js';

describe('@unit calculateContainerBlock preview', () => {
    let releaseCredentials;
    beforeEach(() => { releaseCredentials = installCredentialPreparation(); });

    let orig;

    beforeEach(() => {
        orig = {
            getDocumentOwner: PolicyUtils.getDocumentOwner,
            getDocumentRelayerAccount: PolicyUtils.getDocumentRelayerAccount,
            loadSchemaByID: PolicyUtils.loadSchemaByID
        };
        PolicyUtils.getDocumentOwner = async () => ({ did: 'did:owner', group: 'g-1' });
        PolicyUtils.getDocumentRelayerAccount = async () => '0.0.42';
        PolicyUtils.loadSchemaByID = async (ref, iri) => ({ iri, codeVersion: '1.0.0', contextURL: 'schema:ctx' });
    });

    afterEach(() => {
        Object.assign(PolicyUtils, orig);
    });

    after(() => restoreHarness());

    const refWith = (options) => ({
        policyId: 'p-1',
        tag: 'calc',
        blockType: 'calculateContainerBlock',
        uuid: 'c-1',
        policyOwner: 'did:policy-owner',
        components: { generateUUID: async () => 'urn:uuid:test-output' },
        debugContext: async (context) => context,
        getOptions: async () => options
    });

    const setup = () => {
        const { block } = makeBlock(CalculateContainerBlock, { options: {} });
        block.calculate = async () => ({ total: 9 });
        const process = block.process.bind(block);
        block.process = (...args) => PreviewScope.run(args[3], () => process(...args));
        return block;
    };

    const input = () => ({ schema: '#in', document: PolicyUtils.createVcFromSubject({ a: 1 }).toJsonTree() });

    it('does not reject missing linked inputs before a successful calculation', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource({ schema: '#in', document: {}, paths: ['a'], dependencies: {} });
        const block = setup();
        let calculations = 0;
        block.calculate = async () => { calculations++; return {}; };
        await block.process(input(), refWith({ inputFields: [{ name: 'a', value: 'a' }], unsigned: true }), 'uid', step, makeUser());
        assert.equal(calculations, 1);
    });

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
        const options = { outputSchema: '#out', unsigned: true, outputFields: [{ name: 'total', value: 't' }] };
        const item = await setup().process(input(), refWith(options), 'uid', step, makeUser());
        assert.equal(item.owner, undefined);
        assert.equal(item.document.issuer, undefined);
        assert.equal(item.schema, undefined);
        assert.equal(getPreviewDocumentSchema(item), '#out');
        assert.deepEqual(getPreviewComputed(item), ['total']);
    });

    it('records input fields against the preview schema of an unsigned input document', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const source = setPreviewDocumentSchema(
            setPreviewComputed({ document: PolicyUtils.createVcFromSubject({ a: 1 }).toJsonTree() }, ['total']),
            '#in'
        );
        const options = { outputSchema: '#out', inputFields: [{ name: 'amount', value: 'a' }, { name: 'total', value: 't' }] };
        await setup().process(source, refWith(options), 'uid', step, makeUser());
        assert.deepEqual(step.getPreviewReads(), [{ schema: '#in', path: 'amount' }]);
    });

    it('records its input fields against the schema of the input document', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const options = { outputSchema: '#out', inputFields: [{ name: 'amount', value: 'a' }] };
        await setup().process(input(), refWith(options), 'uid', step, makeUser());
        assert.deepEqual(step.getPreviewReads(), [{ schema: '#in', path: 'amount' }]);
    });

    it('keeps the reference, id, policy and links of the input document', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const source = {
            schema: '#in',
            messageId: 'msg-1',
            document: PolicyUtils.createVcFromSubject({ a: 1, id: 'source-id', ref: 'parent-id' }).toJsonTree()
        };
        const item = await setup().process(source, refWith({ outputSchema: '#out' }), 'uid', step, makeUser());
        const subject = item.document.credentialSubject[0];
        assert.equal(subject.ref, 'parent-id');
        assert.equal(subject.id, 'urn:uuid:source-id');
        assert.equal(subject.policyId, 'p-1');
        assert.equal(subject.total, 9);
        assert.deepEqual(item.relationships, ['msg-1']);
        assert.equal(item.relayerAccount, '0.0.42');
    });

    it('marks its output fields as computed on the document it returns', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const options = { outputSchema: '#out', outputFields: [{ name: 'total', value: 't' }] };
        const item = await setup().process(input(), refWith(options), 'uid', step, makeUser());
        assert.deepEqual(getPreviewComputed(item), ['total']);
    });

    it('does not record an input field the input document got from an earlier block', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const options = { outputSchema: '#out', inputFields: [{ name: 'amount', value: 'a' }, { name: 'rate', value: 'r' }] };
        const source = setPreviewComputed(input(), ['amount']);
        await setup().process(source, refWith(options), 'uid', step, makeUser());
        assert.deepEqual(step.getPreviewReads(), [{ schema: '#in', path: 'rate' }]);
    });
    afterEach(() => releaseCredentials());

});
