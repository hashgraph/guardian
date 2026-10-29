import { installCredentialPreparation } from '../helpers/credential-preparation-stubs.mjs';
import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { fillPreviewPlaceholders, getPreviewComputed, getPreviewDocumentSchema, PreviewScope, resolvePreviewFields, setPreviewComputed } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { Users } from '@guardian/common/helpers/users';

const schemaFields = ['amount', 'temp', 'final', 'rate', 'total'];

const loadSchema = async (ref, iri) => ({
    iri,
    name: 'Test',
    codeVersion: '1.0.0',
    contextURL: 'schema:ctx',
    document: JSON.stringify({
        $id: iri,
        type: 'object',
        properties: Object.fromEntries(schemaFields.map((name) => [
            name,
            { title: name, type: 'number', $comment: JSON.stringify({ term: name }) }
        ]))
    })
});

const expression = (input, output, code) => ({
    variables: [{ type: 'link', name: 'a', description: '', field: input, schema: '#S' }],
    formulas: [{ type: 'variable', name: 'b', description: '', body: 'a+1', params: [], relationships: [] }],
    outputs: [{ type: 'link', name: 'b', description: '', field: output, schema: '#S' }],
    code
});

const code = (text) => ({ variables: [], formulas: [], outputs: [], code: text });

const mathRef = (tag, expr, outputSchema = '#S', extra = {}) => {
    const options = { expression: expr, inputSchema: '#S', outputSchema, ...extra };
    return {
        policyId: 'p-1',
        tag,
        blockType: 'mathBlock',
        policyOwner: 'did:policy-owner',
        components: { generateUUID: async () => 'urn:uuid:test-output' },
        debugContext: async (context) => context,
        getOptions: async () => options,
        warn() {}
    };
};

const formDocument = () => ({
    schema: '#S',
    owner: 'did:user',
    document: PolicyUtils.createVcFromSubject({ amount: 2, id: 'source-id', ref: 'parent-id', policyId: 'p-1' }).toJsonTree()
});

const previewStep = (paths, document = { amount: 2 }) => {
    const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
    step.setPreviewSource({ schema: '#S', document, paths, dependencies: {} });
    return step;
};

const resolved = (step) => resolvePreviewFields(step.getPreviewSource(), step.getPreviewReads());

const runMath = (step, ref, document) => {
    const { block } = makeBlock(MathBlock, { options: {} });
    return PreviewScope.run(step, () => block.process(document, ref, 'uid', step.id, makeUser(), [], true));
};

const subject = (item) => item.document.credentialSubject[0];

describe('@unit mathBlock preview chain with real workers', function () {
    let releaseCredentials;
    beforeEach(() => { releaseCredentials = installCredentialPreparation(); });

    this.timeout(20000);

    let orig;

    beforeEach(() => {
        orig = {
            loadSchemaByID: PolicyUtils.loadSchemaByID,
            findRelationships: PolicyUtils.findRelationships,
            getDocumentOwner: PolicyUtils.getDocumentOwner,
            getDocumentRelayerAccount: PolicyUtils.getDocumentRelayerAccount
        };
        PolicyUtils.loadSchemaByID = loadSchema;
        PolicyUtils.findRelationships = async () => [];
        PolicyUtils.getDocumentOwner = async () => makeUser();
        PolicyUtils.getDocumentRelayerAccount = async () => null;
    });

    afterEach(() => {
        Object.assign(PolicyUtils, orig);
    });

    after(() => restoreHarness());

    it('does not ask the user for a field an earlier Math block computed', async () => {
        const step = previewStep(['amount', 'temp', 'final']);
        const first = await runMath(step, mathRef('math1', expression('amount', 'temp')), formDocument());
        const second = await runMath(step, mathRef('math2', expression('temp', 'final')), first);
        assert.equal(subject(second).temp, 3);
        assert.equal(subject(second).final, 4);
        assert.deepEqual(resolvePreviewFields(step.getPreviewSource(), step.getPreviewReads()), {
            fields: ['amount'],
            missingFields: []
        });
    });

    it('keeps the fields a failed code section read, so the missing one becomes required', async () => {
        const step = previewStep(['amount', 'rate', 'final']);
        const code = 'if (document.amount > 0) result.final = document.rate.toFixed(2);';
        await assert.rejects(
            runMath(step, mathRef('failing', expression('amount', 'final', code)), formDocument()),
            /toFixed/
        );
        assert.deepEqual(resolvePreviewFields(step.getPreviewSource(), step.getPreviewReads()), {
            fields: ['amount', 'rate'],
            missingFields: ['rate']
        });
    });

    it('passes the reference of the form to a script after a Math block that writes another schema', async () => {
        const step = previewStep(['amount', 'temp']);
        const math = await runMath(step, mathRef('cross', expression('amount', 'temp'), '#OUT'), formDocument());
        assert.equal(math.schema, '#OUT');
        assert.equal(subject(math).ref, 'parent-id');
        assert.equal(subject(math).id, 'urn:uuid:source-id');

        const { block } = makeBlock(CustomLogicBlock, {
            componentsOverrides: { generateUUID: async () => 'urn:uuid:custom-output' },
            options: {
                outputSchema: '#RES',
                expression: "const doc = documents[0].document.credentialSubject[0]; done({ total: doc.ref === 'parent-id' ? doc.temp * 2 : doc.temp * 3 });"
            }
        });
        const item = await PreviewScope.run(step, () => block.execute({ data: math }, makeUser(), async () => {}, 'uid', step));
        assert.equal(subject(item).total, 6);
        assert.equal(subject(item).ref, 'parent-id');
        assert.equal(item.schema, '#RES');
        assert.equal(item.document.proof, undefined);
    });

    it('still asks for a field in one branch when only another branch computed it', async () => {
        const step = previewStep(['amount', 'temp', 'final']);
        const branchA = await runMath(step, mathRef('mathA', expression('amount', 'temp')), formDocument());
        const branchB = await runMath(step, mathRef('mathB', expression('temp', 'final')), formDocument());
        assert.equal(subject(branchA).temp, 3);
        assert.equal(subject(branchB).temp, undefined);
        assert.deepEqual(resolvePreviewFields(step.getPreviewSource(), step.getPreviewReads()), {
            fields: ['amount', 'temp'],
            missingFields: ['temp']
        });
    });

    const runScript = (step, document, options) => {
        const { block } = makeBlock(CustomLogicBlock, { options, componentsOverrides: { generateUUID: async () => 'urn:uuid:custom-output' } });
        return PreviewScope.run(step, () => block.execute({ data: document }, makeUser(), async () => {}, 'uid', step));
    };

    it('carries a newly requested temporary relayer through real Math and Custom Logic workers', async () => {
        const saved = {
            find: Users.prototype.getUserRelayerAccount,
            create: Users.prototype.createRelayerAccount,
            balance: PolicyUtils.checkAccountBalance
        };
        const calls = [];
        Users.prototype.getUserRelayerAccount = async () => {
            calls.push('find');
            throw new Error('Relayer account not found.');
        };
        Users.prototype.createRelayerAccount = async () => { calls.push('create'); throw new Error('must not create'); };
        PolicyUtils.checkAccountBalance = async () => { calls.push('balance'); throw new Error('must not query balance'); };
        PolicyUtils.getDocumentRelayerAccount = orig.getDocumentRelayerAccount;
        try {
            const step = previewStep(['amount', 'temp', 'final']);
            const output = await PreviewScope.run(step, async () => {
                const user = makeUser();
                const request = { relayerAccount: { name: 'new' } };
                const form = { blockType: 'requestVcDocumentBlock', dryRun: null };
                await PolicyComponentsUtils._checkRelayerAccount(form, user, request, true);
                const [account] = await PolicyUtils.getRelayerAccountAndOwner(form, user, request.relayerAccount, null, false);
                const document = { ...formDocument(), relayerAccount: account };
                const math = await runMath(step, mathRef('math', expression('amount', 'temp')), document);
                assert.equal(math.relayerAccount, account);
                assert.equal(subject(math).temp, 3);
                const script = await runScript(step, math, {
                    outputSchema: '#S',
                    expression: 'const doc = documents[0].document.credentialSubject[0]; done({ final: doc.temp + 1 });'
                });
                assert.equal(script.relayerAccount, account);
                return script;
            });
            assert.equal(subject(output).final, 4);
            assert.deepEqual(calls, []);
        } finally {
            Users.prototype.getUserRelayerAccount = saved.find;
            Users.prototype.createRelayerAccount = saved.create;
            PolicyUtils.checkAccountBalance = saved.balance;
        }
    });

    it('does not ask the user for a field a Custom Logic script computed', async () => {
        const step = previewStep(['amount', 'temp', 'final']);
        const script = await runScript(step, formDocument(), {
            outputSchema: '#S',
            expression: 'const doc = documents[0].document.credentialSubject[0]; done({ temp: doc.amount + 1 });'
        });
        const math = await runMath(step, mathRef('math', expression('temp', 'final')), script);
        assert.equal(subject(math).final, 4);
        assert.deepEqual(resolvePreviewFields(step.getPreviewSource(), step.getPreviewReads()), {
            fields: ['amount'],
            missingFields: []
        });
    });

    it('still asks for a field a script passed through unchanged, and not for one it set', async () => {
        const passThrough = previewStep(['amount', 'temp', 'final']);
        const unchanged = await runScript(passThrough, formDocument(), {
            passOriginal: true,
            expression: 'done(documents[0]);'
        });
        await runMath(passThrough, mathRef('math', expression('temp', 'final')), unchanged);
        assert.deepEqual(resolvePreviewFields(passThrough.getPreviewSource(), passThrough.getPreviewReads()), {
            fields: ['temp'],
            missingFields: ['temp']
        });

        const filled = previewStep(['amount', 'temp', 'final']);
        const changed = await runScript(filled, formDocument(), {
            passOriginal: true,
            expression: 'const doc = documents[0].document.credentialSubject[0]; doc.temp = doc.amount + 1; done(documents[0]);'
        });
        await runMath(filled, mathRef('math', expression('temp', 'final')), changed);
        assert.deepEqual(resolvePreviewFields(filled.getPreviewSource(), filled.getPreviewReads()), {
            fields: ['amount'],
            missingFields: []
        });
    });

    const placeholderDocument = () => {
        const document = formDocument();
        fillPreviewPlaceholders(schemaFields.map((name) => ({ name, type: 'number' })), subject(document));
        return document;
    };

    it('does not ask for a field a script sets to the same value as the discovery placeholder', async () => {
        const assigned = previewStep(['amount', 'temp', 'final']);
        const passed = await runScript(assigned, placeholderDocument(), {
            passOriginal: true,
            expression: 'const doc = documents[0].document.credentialSubject[0]; doc.temp = doc.amount * 0; done(documents[0]);'
        });
        await runMath(assigned, mathRef('math', expression('temp', 'final')), passed);
        assert.deepEqual(resolvePreviewFields(assigned.getPreviewSource(), assigned.getPreviewReads()), {
            fields: ['amount'],
            missingFields: []
        });

        const created = previewStep(['amount', 'temp', 'final']);
        const result = await runScript(created, placeholderDocument(), {
            outputSchema: '#S',
            expression: 'const doc = documents[0].document.credentialSubject[0]; done({ temp: doc.amount * 0 });'
        });
        await runMath(created, mathRef('math', expression('temp', 'final')), result);
        assert.deepEqual(resolvePreviewFields(created.getPreviewSource(), created.getPreviewReads()), {
            fields: ['amount'],
            missingFields: []
        });
    });

    it('does not count a write to one input document for another returned document', async () => {
        const run = async (code, documents = [formDocument(), formDocument()]) => {
            const step = previewStep(['amount', 'temp', 'final']);
            const output = await runScript(step, documents, { passOriginal: true, expression: code });
            const math = await runMath(step, mathRef('math', expression('temp', 'final')), output);
            return { output, math, fields: resolvePreviewFields(step.getPreviewSource(), step.getPreviewReads()) };
        };

        const other = await run('documents[0].document.credentialSubject[0].temp = 3; done(documents[1]);');
        assert.equal(subject(other.output).temp, undefined);
        assert.deepEqual(getPreviewComputed(other.output), []);
        assert.deepEqual(other.fields, { fields: ['temp'], missingFields: ['temp'] });

        const same = await run('documents[1].document.credentialSubject[0].temp = 3; done(documents[1]);');
        assert.equal(subject(same.math).final, 4);
        assert.deepEqual(getPreviewComputed(same.output), ['temp']);
        assert.deepEqual(same.fields, { fields: [], missingFields: [] });

        const none = await run('done(documents[1]);');
        assert.deepEqual(getPreviewComputed(none.output), []);
        assert.deepEqual(none.fields, { fields: ['temp'], missingFields: ['temp'] });

        const filled = formDocument();
        subject(filled).temp = 7;
        const copy = await run('done(JSON.parse(JSON.stringify(documents[1])));', [formDocument(), filled]);
        assert.equal(subject(copy.output).temp, 7);
        assert.deepEqual(getPreviewComputed(copy.output), []);
    });

    const computedDocument = () => {
        const document = formDocument();
        subject(document).temp = 3;
        return setPreviewComputed(document, ['temp']);
    };

    const runSubject = async (code, documents) => {
        const step = previewStep(['amount', 'temp', 'final']);
        const output = await runScript(step, documents, { outputSchema: '#S', expression: code });
        const math = await runMath(step, mathRef('math', expression('temp', 'final')), output);
        return { output, math, fields: resolvePreviewFields(step.getPreviewSource(), step.getPreviewReads()) };
    };

    it('does not give a returned subject the computed fields of another input document', async () => {
        const other = await runSubject('done(documents[1].document.credentialSubject[0]);', [computedDocument(), formDocument()]);
        assert.equal(subject(other.output).temp, undefined);
        assert.deepEqual(getPreviewComputed(other.output), []);
        assert.deepEqual(other.fields, { fields: ['temp'], missingFields: ['temp'] });

        const same = await runSubject('done(documents[0].document.credentialSubject[0]);', [computedDocument(), formDocument()]);
        assert.equal(subject(same.math).final, 4);
        assert.deepEqual(same.fields, { fields: [], missingFields: [] });

        const spread = await runSubject('done({ ...documents[1].document.credentialSubject[0] });', [computedDocument(), formDocument()]);
        assert.deepEqual(getPreviewComputed(spread.output), []);
        assert.deepEqual(spread.fields.missingFields, ['temp']);
    });

    it('marks only what a script wrote on a returned subject, not the fields it did not touch', async () => {
        const written = await runSubject(
            'const doc = documents[0].document.credentialSubject[0]; doc.temp = doc.amount * 0; done(doc);',
            [placeholderDocument()]
        );
        assert.deepEqual(written.fields, { fields: ['amount'], missingFields: [] });

        const untouched = await runSubject(
            'const doc = documents[0].document.credentialSubject[0]; doc.total = doc.amount; done(doc);',
            [placeholderDocument()]
        );
        assert.deepEqual(untouched.fields, { fields: ['amount', 'temp'], missingFields: ['temp'] });
    });

    const rowsDocument = (rows) => {
        const document = formDocument();
        subject(document).items = rows;
        return document;
    };

    const rowsStep = (rows) => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource({
            schema: '#S',
            document: { amount: 2, items: rows },
            paths: ['amount', 'items', 'items.value', 'items.total', 'final'],
            dependencies: {}
        });
        return step;
    };

    it('still asks for a field in a row when the script computed only another field of that row', async () => {
        const step = rowsStep([{}]);
        const script = await runScript(step, rowsDocument([{}]), {
            passOriginal: true,
            expression: 'const doc = documents[0].document.credentialSubject[0]; doc.items[0].total = doc.amount; done(documents[0]);'
        });
        await runMath(step, mathRef('rows', expression('items.0.value', 'final')), script);
        assert.deepEqual(resolvePreviewFields(step.getPreviewSource(), step.getPreviewReads()), {
            fields: ['amount', 'items.0.value'],
            missingFields: ['items.0.value']
        });
    });

    it('still asks for a field in a row the script did not compute', async () => {
        const script = 'const doc = documents[0].document.credentialSubject[0]; doc.items[0].value = 5; done(documents[0]);';
        const otherRow = rowsStep([{}, {}]);
        const otherOutput = await runScript(otherRow, rowsDocument([{}, {}]), { passOriginal: true, expression: script });
        await runMath(otherRow, mathRef('rows', expression('items.1.value', 'final')), otherOutput);
        assert.deepEqual(resolvePreviewFields(otherRow.getPreviewSource(), otherRow.getPreviewReads()).missingFields, ['items.1.value']);

        const sameRow = rowsStep([{}, {}]);
        const sameOutput = await runScript(sameRow, rowsDocument([{}, {}]), { passOriginal: true, expression: script });
        await runMath(sameRow, mathRef('rows', expression('items.0.value', 'final')), sameOutput);
        assert.deepEqual(resolvePreviewFields(sameRow.getPreviewSource(), sameRow.getPreviewReads()).missingFields, []);
    });

    const withValues = (values) => {
        const document = formDocument();
        Object.assign(subject(document), values);
        return document;
    };

    it('asks for a field the code reads through result', async () => {
        const empty = previewStep(['amount', 'rate', 'final']);
        await assert.rejects(runMath(empty, mathRef('result', code('result.final = result.rate * 2;')), formDocument()), /non-finite/);
        assert.deepEqual(resolved(empty), { fields: ['rate'], missingFields: ['rate'] });

        const filled = previewStep(['amount', 'rate', 'final'], { amount: 2, rate: 3 });
        const math = await runMath(filled, mathRef('result', code('result.final = result.rate * 2;')), withValues({ rate: 3 }));
        assert.equal(subject(math).final, 6);
        assert.deepEqual(resolved(filled), { fields: ['rate'], missingFields: [] });
    });

    it('asks for the nested field the code reads from a value getField returned', async () => {
        const paths = ['amount', 'location', 'location.lat', 'location.lng', 'final'];
        const step = previewStep(paths, { amount: 2, location: {} });
        await assert.rejects(runMath(step, mathRef('nested', code("result.final = getField('location').lat * 2;")), withValues({ location: {} })), /non-finite/);
        assert.deepEqual(resolved(step), { fields: ['location.lat'], missingFields: ['location.lat'] });
    });

    it('does not ask for a field the code wrote and then read back, or for one it only reads with a default', async () => {
        const own = previewStep(['amount', 'temp', 'final']);
        await runMath(own, mathRef('own', code('result.temp = document.amount + 1; result.final = result.temp * 2;')), formDocument());
        assert.deepEqual(resolved(own), { fields: ['amount'], missingFields: [] });

        const before = previewStep(['amount', 'rate', 'final']);
        await runMath(before, mathRef('before', code('result.rate = (result.rate || 1) * 2; result.final = result.rate;')), formDocument());
        assert.deepEqual(resolved(before), { fields: [], missingFields: [] });

        const group = previewStep(['amount', 'location', 'location.lat', 'final'], { amount: 2, location: {} });
        await runMath(group, mathRef('group', code('document.location.lat = 1; result.final = document.location.lat * 2;')), withValues({ location: {} }));
        assert.deepEqual(resolved(group), { fields: [], missingFields: [] });
    });

    it('asks for an element of a list of numbers the code reads when it writes another element', async () => {
        const script = 'const value = document.values[1]; result.values[0] = 1; result.final = value * 2;';
        const empty = previewStep(['values', 'final'], { values: [] });
        await assert.rejects(runMath(empty, mathRef('values', code(script)), withValues({ values: [] })), /non-finite/);
        assert.deepEqual(resolved(empty), { fields: ['values'], missingFields: ['values'] });

        const filled = previewStep(['values', 'final'], { values: [0, 3] });
        const math = await runMath(filled, mathRef('values', code(script)), withValues({ values: [0, 3] }));
        assert.equal(subject(math).final, 6);
        assert.deepEqual(resolved(filled), { fields: ['values'], missingFields: [] });

        const logic = previewStep(['values', 'final'], { values: [] });
        await assert.rejects(runScript(logic, withValues({ values: [] }), {
            outputSchema: '#S',
            expression: 'const doc = documents[0].document.credentialSubject[0]; const value = doc.values[1]; doc.values[0] = 1; doc.final = value * 2; done(doc);'
        }), /non-finite/);
        assert.deepEqual(resolved(logic), { fields: ['values'], missingFields: ['values'] });
    });

    it('keeps the preview schema of an unsigned document a script passes through', async () => {
        const run = async (values, document) => {
            const step = previewStep(['amount', 'temp', 'rate', 'final'], document);
            const unsigned = await runMath(step, mathRef('unsigned', expression('amount', 'temp'), '#S', { unsigned: true }), withValues(values));
            const passed = await runScript(step, unsigned, { passOriginal: true, expression: 'done(documents[0]);' });
            const math = await runMath(step, mathRef('next', code('result.final = document.rate * 2;')), passed).catch((error) => error);
            return { passed, math, fields: resolved(step) };
        };

        const missing = await run({}, { amount: 2 });
        assert.match(missing.math.message, /non-finite/);
        assert.equal(missing.passed.schema, undefined);
        assert.equal(getPreviewDocumentSchema(missing.passed), '#S');
        assert.deepEqual(missing.fields, { fields: ['amount', 'rate'], missingFields: ['rate'] });

        const filled = await run({ rate: 3 }, { amount: 2, rate: 3 });
        assert.equal(subject(filled.math).final, 6);
        assert.deepEqual(filled.fields, { fields: ['amount', 'rate'], missingFields: [] });
    });

    it('still asks for a field read from a copy whose schema is unknown', async () => {
        const other = () => ({ schema: '#R', owner: 'did:user', document: PolicyUtils.createVcFromSubject({ note: 1 }).toJsonTree() });
        const run = async (values, document, script, otherSchema = true) => {
            const step = previewStep(['amount', 'temp', 'rate', 'final'], document);
            const unsigned = await runMath(step, mathRef('unsigned', expression('amount', 'temp'), '#S', { unsigned: true }), withValues(values));
            const second = otherSchema
                ? other()
                : await runMath(step, mathRef('unsigned', expression('amount', 'temp'), '#S', { unsigned: true }), withValues(values));
            const passed = await runScript(step, [unsigned, second], { passOriginal: true, expression: script });
            const math = await runMath(step, mathRef('next', code('result.final = document.rate * 2;')), passed).catch((error) => error);
            return { passed, math, fields: resolved(step) };
        };
        const copy = 'done(JSON.parse(JSON.stringify(documents[0])));';

        const missing = await run({}, { amount: 2 }, copy);
        assert.equal(getPreviewDocumentSchema(missing.passed), null);
        assert.deepEqual(missing.fields, { fields: ['amount', 'rate'], missingFields: ['rate'] });

        const filled = await run({ rate: 3 }, { amount: 2, rate: 3 }, copy);
        assert.equal(subject(filled.math).final, 6);
        assert.deepEqual(filled.fields, { fields: ['amount', 'rate'], missingFields: [] });

        const matched = await run({}, { amount: 2 }, 'done(documents[0]);');
        assert.equal(getPreviewDocumentSchema(matched.passed), '#S');
        assert.deepEqual(matched.fields, { fields: ['amount', 'rate'], missingFields: ['rate'] });

        const same = await run({}, { amount: 2 }, copy, false);
        assert.equal(getPreviewDocumentSchema(same.passed), '#S');
        assert.deepEqual(same.fields, { fields: ['amount', 'rate'], missingFields: ['rate'] });
    });

    it('does not ask the next block for a field the code of an earlier Math block wrote', async () => {
        const step = previewStep(['amount', 'temp', 'final']);
        const first = await runMath(step, mathRef('math1', code('result.temp = document.amount + 1;')), formDocument());
        const second = await runMath(step, mathRef('math2', expression('temp', 'final')), first);
        assert.equal(subject(second).final, 4);
        assert.deepEqual(resolved(step), { fields: ['amount'], missingFields: [] });

        const same = previewStep(['amount', 'temp', 'final']);
        const equal = await runMath(same, mathRef('math1', code('result.temp = document.amount * 0;')), placeholderDocument());
        await runMath(same, mathRef('math2', expression('temp', 'final')), equal);
        assert.deepEqual(resolved(same), { fields: ['amount'], missingFields: [] });
    });

    it('marks only what a new object returned by the code holds', async () => {
        const created = previewStep(['amount', 'temp', 'final']);
        const made = await runMath(created, mathRef('made', code('return { temp: document.amount + 1 };')), formDocument());
        await runMath(created, mathRef('next', expression('temp', 'final')), made);
        assert.deepEqual(resolved(created), { fields: ['amount'], missingFields: [] });

        const dropped = previewStep(['amount', 'temp', 'final']);
        const lost = await runMath(dropped, mathRef('lost', code('result.temp = 3; return { final: 1 };')), formDocument());
        assert.equal(subject(lost).temp, undefined);
        await runMath(dropped, mathRef('next', expression('temp', 'final')), lost);
        assert.deepEqual(resolved(dropped), { fields: ['temp'], missingFields: ['temp'] });
    });

    it('keeps the fields of the form after an unsigned Math block', async () => {
        const step = previewStep(['amount', 'temp', 'final', 'rate']);
        const unsigned = await runMath(step, mathRef('unsigned', expression('amount', 'temp'), '#S', { unsigned: true }), formDocument());
        assert.equal(unsigned.schema, undefined);
        await assert.rejects(runMath(step, mathRef('next', expression('temp', 'final', 'result.total = document.rate * 2;')), unsigned), /non-finite/);
        assert.deepEqual(resolved(step), { fields: ['amount', 'rate'], missingFields: ['rate'] });

        const script = previewStep(['amount', 'temp', 'rate']);
        const input = await runMath(script, mathRef('unsigned', expression('amount', 'temp'), '#S', { unsigned: true }), formDocument());
        await assert.rejects(runScript(script, input, {
            outputSchema: '#S',
            expression: 'const doc = documents[0].document.credentialSubject[0]; done({ total: doc.temp + doc.rate });'
        }), /non-finite/);
        assert.deepEqual(resolved(script), { fields: ['amount', 'rate'], missingFields: ['rate'] });
    });

    it('asks for a Switch condition field read from a copy whose schema is unknown', async () => {
        const rawSwitch = Object.getPrototypeOf(SwitchBlock.prototype).runAction;
        const other = () => ({ schema: '#R', owner: 'did:user', document: PolicyUtils.createVcFromSubject({ note: 1 }).toJsonTree() });
        const run = async (values, document, script) => {
            const step = previewStep(['amount', 'temp', 'rate', 'final'], document);
            const unsigned = await runMath(step, mathRef('unsigned', expression('amount', 'temp'), '#S', { unsigned: true }), withValues(values));
            const passed = await runScript(step, [unsigned, other()], { passOriginal: true, expression: script });
            const { block } = makeBlock(SwitchBlock, {
                options: {
                    executionFlow: 'firstTrue',
                    conditions: [{ type: 'equal', value: 'rate > 10', tag: 'high' }, { type: 'unconditional', tag: 'low' }]
                }
            });
            const fired = [];
            block.triggerEvents = async (type) => { fired.push(type); };
            await PreviewScope.run(step, () => rawSwitch.call(block, { user: makeUser(), data: { data: passed }, actionStatus: step }));
            return { passed, fired, fields: resolved(step) };
        };
        const external = PolicyComponentsUtils.ExternalEventFn;
        PolicyComponentsUtils.ExternalEventFn = () => {};
        try {
            const copy = 'done(JSON.parse(JSON.stringify(documents[0])));';

            const missing = await run({}, { amount: 2 }, copy);
            assert.equal(getPreviewDocumentSchema(missing.passed), null);
            assert.ok(missing.fired.includes('low'));
            assert.deepEqual(missing.fields, { fields: ['amount', 'rate'], missingFields: ['rate'] });

            const filled = await run({ rate: 20 }, { amount: 2, rate: 20 }, copy);
            assert.ok(filled.fired.includes('high'));
            assert.deepEqual(filled.fields, { fields: ['amount', 'rate'], missingFields: [] });

            const otherSchema = await run({}, { amount: 2 }, 'done(documents[1]);');
            assert.equal(getPreviewDocumentSchema(otherSchema.passed), '#R');
            assert.deepEqual(otherSchema.fields, { fields: ['amount'], missingFields: [] });
        } finally {
            PolicyComponentsUtils.ExternalEventFn = external;
        }
    });

    it('leaves a field the script checks for with in to the script, which reports its own error', async () => {
        const script = "const doc = documents[0].document.credentialSubject[0]; if (!('rate' in doc)) throw new Error('rate is required'); done({ final: 7 });";

        const missing = previewStep(['amount', 'rate', 'final']);
        await assert.rejects(runScript(missing, formDocument(), { outputSchema: '#S', expression: script }), /rate is required/);
        assert.deepEqual(resolved(missing), { fields: [], missingFields: [] });

        const filled = previewStep(['amount', 'rate', 'final'], { amount: 2, rate: 20 });
        const result = await runScript(filled, withValues({ rate: 20 }), { outputSchema: '#S', expression: script });
        assert.equal(subject(result).final, 7);
        assert.deepEqual(resolved(filled), { fields: [], missingFields: [] });
    });
    const discoveryStep = (paths) => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource({ schema: '#S', document: {}, paths, dependencies: {}, discovery: true });
        return step;
    };

    it('keeps discovering fields after a Math block divides by an empty placeholder', async () => {
        const paths = ['amount', 'rate', 'temp', 'total', 'final'];
        const divide = code('result.temp = document.amount / document.rate;');
        const multiply = code('result.final = document.temp * document.total;');

        const discovery = discoveryStep(paths);
        const first = await runMath(discovery, mathRef('divide', divide), withValues({ amount: 0, rate: 0, total: 0 }));
        await runMath(discovery, mathRef('multiply', multiply), first);
        assert.deepEqual(resolved(discovery), {
            fields: ['amount', 'rate', 'total'],
            missingFields: ['amount', 'rate', 'total']
        });

        const real = previewStep(paths, { amount: 0, rate: 0, total: 0 });
        await assert.rejects(runMath(real, mathRef('divide', divide), withValues({ amount: 0, rate: 0, total: 0 })), /non-finite/);
    });

    it('lets a Switch after a Math block with an empty placeholder report its condition fields', async () => {
        const rawSwitch = Object.getPrototypeOf(SwitchBlock.prototype).runAction;
        const step = discoveryStep(['amount', 'rate', 'temp', 'total']);
        const math = await runMath(step, mathRef('divide', code('result.temp = document.amount / document.rate;')), withValues({ amount: 0, rate: 0, total: 0 }));
        const { block } = makeBlock(SwitchBlock, {
            options: {
                executionFlow: 'firstTrue',
                conditions: [{ type: 'equal', value: 'temp > total', tag: 'high' }, { type: 'unconditional', tag: 'low' }]
            }
        });
        const fired = [];
        block.triggerEvents = async (type) => { fired.push(type); };
        const external = PolicyComponentsUtils.ExternalEventFn;
        PolicyComponentsUtils.ExternalEventFn = () => {};
        try {
            await PreviewScope.run(step, () => rawSwitch.call(block, { user: makeUser(), data: { data: math }, actionStatus: step }));
        } finally {
            PolicyComponentsUtils.ExternalEventFn = external;
        }
        assert.ok(fired.includes('low'));
        assert.deepEqual(resolved(step), {
            fields: ['amount', 'rate', 'total'],
            missingFields: ['amount', 'rate', 'total']
        });
    });

    it('keeps discovering fields after a script divides by an empty placeholder', async () => {
        const options = {
            outputSchema: '#S',
            expression: 'const doc = documents[0].document.credentialSubject[0]; done({ final: doc.amount / doc.rate });'
        };
        const discovery = discoveryStep(['amount', 'rate', 'final']);
        await runScript(discovery, withValues({ amount: 0, rate: 0 }), options);
        assert.deepEqual(resolved(discovery).fields, ['amount', 'rate']);

        const real = previewStep(['amount', 'rate', 'final'], { amount: 0, rate: 0 });
        await assert.rejects(runScript(real, withValues({ amount: 0, rate: 0 }), options), /non-finite/);
    });

    afterEach(() => releaseCredentials());

});
