import assert from 'node:assert/strict';
import { validateSchemaFieldKeys } from '../../dist/helpers/import-helpers/schema/schema-field-key-validator.js';

function schemaWithFields(fields) {
    return {
        name: 'Test Schema',
        iri: '#test-schema',
        document: {
            type: 'object',
            properties: {},
            required: []
        },
        fields
    };
}

describe('validateSchemaFieldKeys', () => {
    it('rejects field keys containing JSON-LD reserved colon characters', () => {
        const schema = schemaWithFields([
            { name: 'validKey', title: 'Valid key', type: 'string' },
            { name: 'bad:key', title: 'Bad key', type: 'string' }
        ]);

        assert.throws(
            () => validateSchemaFieldKeys(schema),
            /Field key "bad:key".*reserved character ":"/
        );
    });

    it('rejects field keys containing reserved dot characters', () => {
        const schema = schemaWithFields([
            { name: 'bad.key', title: 'Bad key', type: 'string' }
        ]);

        assert.throws(
            () => validateSchemaFieldKeys(schema),
            /Field key "bad\.key".*reserved character "\."/
        );
    });

    it('checks nested schema field keys', () => {
        const schema = schemaWithFields([
            {
                name: 'parent',
                title: 'Parent',
                type: '#nested',
                isRef: true,
                fields: [
                    { name: 'nested:bad', title: 'Nested bad', type: 'string' }
                ]
            }
        ]);

        assert.throws(
            () => validateSchemaFieldKeys(schema),
            /Field key "nested:bad".*Parent > Nested bad/
        );
    });
});
