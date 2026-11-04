import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { installCredentialPreparation } from '../helpers/credential-preparation-stubs.mjs';
import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { getPreviewComputed, getPreviewDocumentSchema, setPreviewComputed } from '../../../dist/policy-engine/helpers/preview.js';

const firstSubject = (item) => Array.isArray(item.document.credentialSubject)
    ? item.document.credentialSubject[0]
    : item.document.credentialSubject;

describe('@unit mathBlock preview', () => {
    let releaseCredentials;
    beforeEach(() => { releaseCredentials = installCredentialPreparation(); });

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
        components: { generateUUID: async () => 'urn:uuid:test-output' },
        debugContext: async (context) => context,
        getOptions: async () => options
    });

    const setup = () => {
        const { block } = makeBlock(MathBlock, { options: { onErrorAction: 'no-action' } });
        const stored = [];
        const signed = [];
        block.calculate = async () => ({ total: 4, results: { type: 'table', rows: [{ year: 2020 }] } });
        block.storeResultTables = async (...args) => { stored.push(args); };
        const createDocument = block.createDocument.bind(block);
        block.createDocument = async (...args) => {
            signed.push(args);
            return await createDocument(...args);
        };
        const process = block.process.bind(block);
        block.process = (...args) => args[6]
            ? PreviewScope.run(new RecordActionStep(() => {}, 0, true, true, undefined, true), () => process(...args))
            : process(...args);
        return { block, stored, signed };
    };

    it('returns an unsigned preview document issued by the policy owner and asks only for preview tables', async () => {
        const { block, stored, signed } = setup();
        const item = await block.process(input(), refWith({ outputSchema: '#out' }), 'uid', 'step-1', makeUser(), [], true);
        assert.equal(stored.length, 1);
        assert.equal(stored[0][5], true);
        assert.equal(signed.length, 1);
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
        assert.equal(stored.length, 1);
        assert.equal(stored[0][5], true);
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
        block.createDocument = async (...args) => { signed.push(args); return { signed: true }; };
        await block.process(input(), refWith({ outputSchema: '#out' }), 'uid', null, makeUser(), [], false);
        assert.equal(stored.length, 1);
        assert.equal(stored[0][5], false);
        assert.equal(signed.length, 1);
    });

    describe('calculated tables', () => {
        const tableExpression = {
            variables: [],
            formulas: [],
            outputs: [{ type: 'link', name: '', field: 'results', schema: '#out', rows: [{ year: 'y' }] }]
        };

        const tableSchema = (tableColumns) => async (ref, iri) => ({
            iri,
            codeVersion: '1.0.0',
            contextURL: 'schema:ctx',
            document: JSON.stringify({
                $id: iri,
                type: 'object',
                properties: {
                    total: { type: 'number' },
                    results: {
                        type: 'string',
                        $comment: JSON.stringify({ term: 'results', customType: 'table', tableColumns })
                    }
                }
            })
        });

        const tableSetup = () => {
            const { block } = makeBlock(MathBlock, { options: { onErrorAction: 'no-action' } });
            const uploads = [];
            const process = block.process.bind(block);
            block.process = (...args) => args[6]
                ? PreviewScope.run(new RecordActionStep(() => {}, 0, true, true, undefined, true), () => process(...args))
                : process(...args);
            block.calculate = async () => ({ total: 4, results: { type: 'table', rows: [{ year: 2020 }, { year: 2021 }] } });
            block.storeResultTable = async (...args) => {
                uploads.push(args);
                return 'stored';
            };
            return { block, uploads };
        };

        it('puts a calculated table into the preview document as inline csv, without storing a file', async () => {
            PolicyUtils.loadSchemaByID = tableSchema([{ name: 'Year', key: 'year' }]);
            const { block, uploads } = tableSetup();
            const options = { expression: tableExpression, inputSchema: '#in', outputSchema: '#out' };
            const item = await block.process(input(), refWith(options), 'uid', 'step-1', makeUser(), [], true);
            assert.equal(uploads.length, 0);
            const table = JSON.parse(firstSubject(item).results);
            assert.match(table.fileId, /^preview-/);
            assert.deepEqual({ ...table, fileId: undefined }, {
                type: 'table',
                fileId: undefined,
                csv: 'Year\r\n2020\r\n2021',
                columnNames: ['Year'],
                columnKeys: ['year']
            });
        });

        it('fails a preview of a table output with no declared columns, as a normal run does', async () => {
            PolicyUtils.loadSchemaByID = tableSchema([]);
            const { block, uploads } = tableSetup();
            const options = { expression: tableExpression, inputSchema: '#in', outputSchema: '#out' };
            await assert.rejects(
                block.process(input(), refWith(options), 'uid', 'step-1', makeUser(), [], true),
                /Table output "results" has no declared columns/
            );
            assert.equal(uploads.length, 0);
        });
    });
    afterEach(() => releaseCredentials());

});
