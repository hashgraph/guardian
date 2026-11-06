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

    it('leaves document validation and values unchanged', () => {
        const validate = new Ajv().compile({ type: 'object', properties: { project: property('Guidance') }, required: ['project'] });
        const document = { project: 'Project Hub' };
        assert.equal(validate(document), true);
        assert.deepEqual(document, { project: 'Project Hub' });
        assert.equal(validate({ project: 10 }), false);
    });
});
