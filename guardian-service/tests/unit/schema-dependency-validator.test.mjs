import assert from 'node:assert/strict';
import {
    validateSchemaDependencies,
} from '../../dist/helpers/import-helpers/schema/schema-dependency-validator.js';

const property = (customType, dependency) => ({
    type: 'string',
    $comment: JSON.stringify({
        customType,
        ...(dependency ? { dependency } : {}),
    }),
});

const document = (properties) => ({
    $id: '#GeoTest',
    type: 'object',
    properties,
});

describe('validateSchemaDependencies', () => {
    it('accepts Country to Continent', () => {
        assert.doesNotThrow(() => validateSchemaDependencies(document({
            continent: property('continent'),
            country: property('country', { on: 'continent', kind: 'geo' }),
        })));
    });

    it('accepts State to Country and State to Continent', () => {
        assert.doesNotThrow(() => validateSchemaDependencies(document({
            country: property('country'),
            state: property('state', { on: 'country', kind: 'geo' }),
        })));
        assert.doesNotThrow(() => validateSchemaDependencies(document({
            continent: property('continent'),
            state: property('state', { on: 'continent', kind: 'geo' }),
        })));
    });

    it('accepts schemas without dependencies', () => {
        assert.doesNotThrow(() => validateSchemaDependencies(document({
            name: { type: 'string' },
        })));
    });

    it('rejects a missing target', () => {
        assert.throws(
            () => validateSchemaDependencies(document({
                country: property('country', {
                    on: 'missing',
                    kind: 'geo',
                }),
            })),
            /does not exist/
        );
    });

    it('rejects an unsupported kind', () => {
        assert.throws(
            () => validateSchemaDependencies(document({
                continent: property('continent'),
                country: property('country', {
                    on: 'continent',
                    kind: 'unknown',
                }),
            })),
            /Unsupported dependency kind/
        );
    });

    it('rejects incompatible field types', () => {
        assert.throws(
            () => validateSchemaDependencies(document({
                state: property('state'),
                country: property('country', {
                    on: 'state',
                    kind: 'geo',
                }),
            })),
            /incompatible/
        );
    });

    it('rejects self-reference', () => {
        assert.throws(
            () => validateSchemaDependencies(document({
                country: property('country', {
                    on: 'country',
                    kind: 'geo',
                }),
            })),
            /cannot depend on itself/
        );
    });

    it('rejects a multi-field cycle before persistence', () => {
        assert.throws(
            () => validateSchemaDependencies(document({
                continent: property('continent', {
                    on: 'state',
                    kind: 'geo',
                }),
                country: property('country', {
                    on: 'continent',
                    kind: 'geo',
                }),
                state: property('state', {
                    on: 'country',
                    kind: 'geo',
                }),
            })),
            /Circular field dependency/
        );
    });

    it('validates each $defs scope independently', () => {
        const schema = document({ name: { type: 'string' } });
        schema.$defs = {
            '#Nested': document({
                country: property('country', {
                    on: 'missing',
                    kind: 'geo',
                }),
            }),
        };
        assert.throws(
            () => validateSchemaDependencies(schema),
            /#Nested.*does not exist|does not exist.*#Nested/
        );
    });
});
