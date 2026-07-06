import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.getSchemaName', () => {
    it('returns "" when nothing is supplied', () => {
        assert.equal(SchemaHelper.getSchemaName(), '');
    });

    it('returns just the name when only name is supplied', () => {
        assert.equal(SchemaHelper.getSchemaName('Schema-1'), 'Schema-1');
    });

    it('appends a parenthesised version when supplied', () => {
        assert.equal(
            SchemaHelper.getSchemaName('Schema-1', '1.0.0'),
            'Schema-1 (1.0.0)',
        );
    });

    it('appends both version and status, in that order', () => {
        assert.equal(
            SchemaHelper.getSchemaName('Schema-1', '1.0.0', 'PUBLISH'),
            'Schema-1 (1.0.0) (PUBLISH)',
        );
    });

    it('appends just status when version is missing', () => {
        assert.equal(
            SchemaHelper.getSchemaName('Schema-1', undefined, 'DRAFT'),
            'Schema-1 (DRAFT)',
        );
    });
});

describe('SchemaHelper.checkErrors', () => {
    it('returns [] when there are no schema- or field-level errors', () => {
        assert.deepEqual(SchemaHelper.checkErrors({}), []);
        assert.deepEqual(SchemaHelper.checkErrors({ errors: [], fields: [] }), []);
    });

    it('marks schema-level errors with target.type="schema"', () => {
        const schema = { errors: [{ message: 'oops' }], fields: [] };
        const result = SchemaHelper.checkErrors(schema);
        assert.equal(result.length, 1);
        assert.equal(result[0].target.type, 'schema');
        assert.equal(result[0].message, 'oops');
    });

    it('flattens errors from each field array', () => {
        const schema = {
            errors: [],
            fields: [
                { errors: [{ message: 'f1.bad' }] },
                { errors: [{ message: 'f2.bad' }] },
            ],
        };
        const result = SchemaHelper.checkErrors(schema);
        assert.equal(result.length, 2);
        const messages = result.map((e) => e.message);
        assert.ok(messages.includes('f1.bad'));
        assert.ok(messages.includes('f2.bad'));
    });
});
