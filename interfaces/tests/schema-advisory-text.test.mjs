import assert from 'node:assert/strict';
import Ajv from 'ajv';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';
import { SchemaToJson, JsonToSchema, ErrorContext } from '../dist/helpers/schema-json.js';
import { Schema } from '../dist/models/schema.js';

const field = (advisoryText) => ({ name: 'project', type: 'string', description: 'Project', availableOptions: [], advisoryText });
const property = (text) => ({ type: 'string', $comment: SchemaHelper.buildFieldComment(field(text), 'project', 'ctx') });

describe('Schema field advisory text', () => {
    it('saves trimmed plain text and reads it back', () => {
        const value = '  First line\n<b>plain text</b>  ';
        const prop = property(value);
        assert.equal(JSON.parse(prop.$comment).advisoryText, value.trim());
        assert.equal(SchemaHelper.parseField('project', prop, false, 'ctx').advisoryText, value.trim());
    });

    for (const value of [undefined, '', ' \n\t ']) {
        it(`omits empty guidance ${JSON.stringify(value)}`, () => {
            const prop = property(value);
            assert.equal(Object.hasOwn(JSON.parse(prop.$comment), 'advisoryText'), false);
            assert.equal(SchemaHelper.parseField('project', prop, false, 'ctx').advisoryText, undefined);
        });
    }

    it('reads old and malformed metadata without a hint', () => {
        for (const $comment of ['{"term":"project"}', '{bad', '{"advisoryText":42}', '{"advisoryText":"   "}']) {
            assert.equal(SchemaHelper.parseField('project', { type: 'string', $comment }, false, 'ctx').advisoryText, undefined);
        }
    });

    it('keeps guidance through schema construction and serialization', () => {
        const schema = new Schema({ iri: '#advisory', document: {
            $id: '#advisory', type: 'object', properties: { project: property('Guidance') }, $defs: {},
        } });
        assert.equal(schema.fields.find(f => f.name === 'project').advisoryText, 'Guidance');
        schema.update(schema.fields, schema.conditions);
        const reopened = new Schema({ iri: schema.iri, document: schema.document });
        assert.equal(reopened.fields.find(f => f.name === 'project').advisoryText, 'Guidance');
    });

    it('preserves guidance when changing between the visual and JSON editors', () => {
        const json = SchemaToJson.fieldToJson(field('  Guidance  '), 0);
        assert.equal(json.advisoryText, 'Guidance');
        const restored = JsonToSchema.fromField(json, 0, [], 'VC', new Set(), new ErrorContext());
        assert.equal(restored.advisoryText, 'Guidance');
        assert.equal(SchemaToJson.fieldToJson(field('   '), 0).advisoryText, undefined);
        assert.equal(JsonToSchema.fromField({ ...json, advisoryText: '   ' }, 0, [], 'VC', new Set(), new ErrorContext()).advisoryText, undefined);
    });

    it('supports simple inputs, GeoJSON and SentinelHUB only', () => {
        const supported = [
            field('x'), { ...field('x'), type: 'number' }, { ...field('x'), hidden: true },
            { ...field('x'), isRef: true, type: '#GeoJSON', customType: 'geo' },
            { ...field('x'), isRef: true, type: '#SentinelHUB', customType: 'sentinel' },
        ];
        const unsupported = [
            { ...field('x'), type: 'null' },
            { ...field('x'), isRef: true, type: '#child', customType: 'subSchema' },
            { ...field('x'), isRef: true, type: '#child' },
            { ...field('x'), autocalculate: true },
            { ...field('x'), readOnly: true },
            ...['policyId', 'ref', 'guardianVersion'].map(name => ({ ...field('x'), name })),
        ];
        for (const item of supported) {
            assert.equal(SchemaHelper.supportsAdvisoryText(item), true, JSON.stringify(item));
        }
        for (const item of unsupported) {
            assert.equal(SchemaHelper.supportsAdvisoryText(item), false, JSON.stringify(item));
        }
    });

    it('does not save guidance on fields that cannot show it', () => {
        const save = (extra, name = 'project') => JSON.parse(SchemaHelper.buildFieldComment({ ...field('Guidance'), ...extra }, name, 'ctx'));
        assert.equal(save({ isRef: true, type: '#child', customType: 'subSchema' }).advisoryText, undefined);
        assert.equal(save({ type: 'null' }).advisoryText, undefined);
        assert.equal(save({ autocalculate: true }).advisoryText, undefined);
        assert.equal(save({}, 'ref').advisoryText, undefined);
        assert.equal(save({ isRef: true, type: '#GeoJSON', customType: 'geo' }).advisoryText, 'Guidance');
    });

    it('drops hidden guidance from a sub-schema field imported from JSON', () => {
        const schema = new Schema({ iri: '#advisory', document: {
            $id: '#advisory', type: 'object', $defs: {}, properties: {
                child: { $ref: '#child', $comment: JSON.stringify({ term: 'child', customType: 'subSchema', advisoryText: 'Hidden' }) },
            },
        } });
        schema.update(schema.fields, schema.conditions);
        assert.equal(JSON.parse(schema.document.properties.child.$comment).advisoryText, undefined);
    });

    it('leaves document validation and values unchanged', () => {
        const validate = new Ajv().compile({ type: 'object', properties: { project: property('Guidance') }, required: ['project'] });
        const document = { project: 'Project Hub' };
        assert.equal(validate(document), true);
        assert.deepEqual(document, { project: 'Project Hub' });
        assert.equal(validate({ project: 10 }), false);
    });
});
