import assert from 'node:assert/strict';
import { Schema } from '@guardian/interfaces';
import { haveSamePreviewFields, setPreviewSchemaMatches } from '../../../dist/policy-engine/helpers/preview-schema.js';

const field = (name, type, extra = {}) => ({ name, type, isArray: false, isRef: false, ...extra });
const output = (type, final = true) => ({ final, document: { document: { credentialSubject: [{ type }] } } });

describe('@unit preview schema matching', () => {
    it('compares field sets independently of order, visibility and presentation', () => {
        const input = [field('amount', 'number'), field('total', 'number', { hidden: true, required: false })];
        const result = [field('total', 'number', { hidden: false, required: true, description: 'Result' }), field('amount', 'number')];
        assert.equal(haveSamePreviewFields(input, result), true);
    });

    it('rejects extra, missing, renamed and differently typed fields', () => {
        const input = [field('amount', 'number')];
        for (const result of [[], [...input, field('total', 'number')], [field('area', 'number')], [field('amount', 'string')]]) {
            assert.equal(haveSamePreviewFields(input, result), false);
        }
    });

    it('distinguishes scalar, repeated and specialized types', () => {
        assert.equal(haveSamePreviewFields([field('a', 'number')], [field('a', 'number', { isArray: true })]), false);
        assert.equal(haveSamePreviewFields([field('a', 'string')], [field('a', 'string', { format: 'date' })]), false);
        assert.equal(haveSamePreviewFields([field('a', 'string', { customType: 'table' })], [field('a', 'string')]), false);
    });

    it('compares parsed nested fields rather than reference ids', () => {
        const schema = (ref, childType) => new Schema({ document: { type: 'object', properties: {
            rows: { type: 'array', items: { $ref: ref } }
        }, $defs: { [ref]: { type: 'object', properties: { total: { type: childType } } } } } });
        assert.equal(haveSamePreviewFields(schema('#A', 'number').fields, schema('#B', 'number').fields), true);
        assert.equal(haveSamePreviewFields(schema('#A', 'number').fields, schema('#B', 'string').fields), false);
    });

    it('does not match an unresolved nested reference', () => {
        assert.equal(haveSamePreviewFields([field('a', '#A', { isRef: true })], [field('a', '#B', { isRef: true })]), false);
    });

    it('annotates each final document and takes the OR for the form, loading each schema once', async () => {
        const response = { sameSchema: false, documents: [output('match'), output('other'), output(['match']), output('match', false)] };
        const calls = [];
        await setPreviewSchemaMatches(response, '#input', async (id) => {
            calls.push(id);
            return { fields: [field('amount', id === '#other' ? 'string' : 'number')] };
        });
        assert.equal(response.sameSchema, true);
        assert.deepEqual(response.documents.map((item) => item.sameSchema), [true, false, true, undefined]);
        assert.deepEqual(calls, ['#input', '#match', '#other']);
    });

    it('handles a credential subject object and a prefixed type', async () => {
        const response = { sameSchema: false, documents: [{ final: true, document: { document: { credentialSubject: { type: '#result' } } } }] };
        await setPreviewSchemaMatches(response, '#input', async () => ({ fields: [] }));
        assert.equal(response.documents[0].sameSchema, true);
    });

    it('does not claim a match for a missing schema or a VP without its own subject', async () => {
        const response = { sameSchema: true, documents: [output('missing'), { final: true, document: { document: { verifiableCredential: [] } } }] };
        await setPreviewSchemaMatches(response, '#input', async (id) => id === '#input' ? { fields: [] } : null);
        assert.equal(response.sameSchema, false);
        assert.deepEqual(response.documents.map((item) => item.sameSchema), [false, false]);
    });

    it('does not load schemas without final documents or a known input schema', async () => {
        const load = async () => { throw new Error('must not load'); };
        await setPreviewSchemaMatches({ sameSchema: false, documents: [] }, '#input', load);
        const response = { sameSchema: true, documents: [output('out')] };
        await setPreviewSchemaMatches(response, null, load);
        assert.equal(response.sameSchema, false);
        assert.equal(response.documents[0].sameSchema, false);
    });

    it('does not hide a schema-loader failure as a successful match', async () => {
        await assert.rejects(setPreviewSchemaMatches({ sameSchema: false, documents: [output('out')] }, '#input', async () => {
            throw new Error('schema lookup failed');
        }), /schema lookup failed/);
    });
});
