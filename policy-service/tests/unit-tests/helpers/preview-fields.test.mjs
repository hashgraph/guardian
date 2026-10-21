import assert from 'node:assert/strict';
import {
    calculatePreviewAutoFields,
    collectPreviewPaths,
    fillPreviewPlaceholders,
    findScriptFieldReads,
    getMathPreviewReads,
    isMissingPreviewValue,
    normalizePreviewPath,
    resolvePreviewFields
} from '../../../dist/policy-engine/helpers/preview.js';

const field = (name, type, extra = {}) => ({ name, type, isRef: false, isArray: false, ...extra });

const formFields = [
    field('amount', 'number'),
    field('count', 'integer', { isArray: true }),
    field('name', 'string'),
    field('flag', 'boolean'),
    field('kind', 'string', { enum: ['A', 'B'] }),
    field('total', 'number', { autocalculate: true, expression: 'amount * 2' }),
    field('table', 'string', { customType: 'table' }),
    { name: 'location', type: '#loc', isRef: true, isArray: false, fields: [field('lat', 'number')] }
];

describe('@unit preview fields', () => {
    describe('fillPreviewPlaceholders', () => {
        it('fills every empty field by its type and keeps filled ones', () => {
            const doc = { amount: 7 };
            fillPreviewPlaceholders(formFields, doc);
            assert.deepEqual(doc, {
                amount: 7,
                count: [0],
                name: '',
                flag: false,
                kind: 'A',
                location: { lat: 0 }
            });
        });

        it('fills inside an existing sub-schema object', () => {
            const doc = { location: {} };
            fillPreviewPlaceholders(formFields, doc);
            assert.deepEqual(doc.location, { lat: 0 });
        });

        it('replaces an empty string and an empty array', () => {
            const doc = { name: '', count: [] };
            fillPreviewPlaceholders(formFields, doc);
            assert.equal(doc.name, '');
            assert.deepEqual(doc.count, [0]);
        });
    });

    describe('collectPreviewPaths', () => {
        it('lists every field path including sub-schema fields', () => {
            assert.deepEqual(collectPreviewPaths(formFields), [
                'amount', 'count', 'name', 'flag', 'kind', 'total', 'table', 'location', 'location.lat'
            ]);
        });
    });

    describe('calculatePreviewAutoFields', () => {
        const autoFields = [
            field('amount', 'number'),
            field('rate', 'number'),
            field('total', 'number', { autocalculate: true, expression: 'amount * rate' }),
            {
                name: 'items',
                type: '#item',
                isRef: true,
                isArray: true,
                fields: [
                    field('value', 'number'),
                    field('double', 'number', { autocalculate: true, expression: 'value * 2' })
                ]
            }
        ];

        it('computes the fields and records what each formula reads', () => {
            const doc = { amount: 2, rate: 3, items: [{ value: 1 }, { value: 4 }] };
            const dependencies = {};
            const errors = [];
            calculatePreviewAutoFields(autoFields, doc, dependencies, errors);
            assert.equal(doc.total, 6);
            assert.equal(doc.items[0].double, 2);
            assert.equal(doc.items[1].double, 8);
            assert.deepEqual(dependencies, { total: ['amount', 'rate'], 'items.double': ['items.value'] });
            assert.deepEqual(errors, []);
        });

        it('does not stop on a missing input', () => {
            const doc = { amount: 2 };
            const dependencies = {};
            const errors = [];
            calculatePreviewAutoFields(autoFields, doc, dependencies, errors);
            assert.ok(Number.isNaN(doc.total));
            assert.deepEqual(dependencies.total, ['amount', 'rate']);
            assert.deepEqual(errors, []);
        });

        it('collects a broken formula as an error and leaves the field unset', () => {
            const doc = { amount: 2, total: 1 };
            const errors = [];
            calculatePreviewAutoFields([field('amount', 'number'), field('total', 'number', { autocalculate: true, expression: 'amount *' })], doc, {}, errors);
            assert.equal('total' in doc, false);
            assert.deepEqual(errors, ['Invalid expression: total']);
        });
    });

    describe('getMathPreviewReads', () => {
        it('uses the link schema or the schema of the current document', () => {
            const expression = {
                variables: [
                    { type: 'link', name: 'a', description: '', field: 'amount', schema: '' },
                    { type: 'link', name: 'b', description: '', field: 'rate', schema: '#R' }
                ],
                formulas: [],
                outputs: []
            };
            assert.deepEqual(getMathPreviewReads(expression, '#S'), [
                { schema: '#S', path: 'amount' },
                { schema: '#R', path: 'rate' }
            ]);
        });

        it('returns nothing without an expression', () => {
            assert.deepEqual(getMathPreviewReads(null, '#S'), []);
        });
    });

    describe('findScriptFieldReads', () => {
        const source = { schema: '#S', document: {}, paths: ['amount', 'location', 'location.lat', 'rate'], dependencies: {} };

        it('finds form fields named in the script as whole words', () => {
            const script = "total = doc['amount'] * doc['location']['lat']\nrated = 1";
            assert.deepEqual(findScriptFieldReads(script, source), [
                { schema: '#S', path: 'amount' },
                { schema: '#S', path: 'location' },
                { schema: '#S', path: 'location.lat' }
            ]);
        });

        it('returns nothing without a form source', () => {
            assert.deepEqual(findScriptFieldReads('amount', null), []);
        });
    });

    describe('normalizePreviewPath and isMissingPreviewValue', () => {
        it('removes array indexes', () => {
            assert.equal(normalizePreviewPath('items.0.value'), 'items.value');
        });

        it('treats a value as missing only when it is empty everywhere', () => {
            const doc = { a: 0, b: '', items: [{ value: '' }, { value: 3 }], list: [] };
            assert.equal(isMissingPreviewValue(doc, 'a'), false);
            assert.equal(isMissingPreviewValue(doc, 'b'), true);
            assert.equal(isMissingPreviewValue(doc, 'c'), true);
            assert.equal(isMissingPreviewValue(doc, 'items.value'), false);
            assert.equal(isMissingPreviewValue(doc, 'list'), true);
        });
    });

    describe('resolvePreviewFields', () => {
        const source = {
            schema: '#S',
            document: { amount: 2, items: [{ value: '' }], location: { lat: 1 } },
            paths: ['amount', 'rate', 'total', 'items', 'items.value', 'items.double', 'location', 'location.lat', 'table'],
            dependencies: { total: ['amount', 'rate'], 'items.double': ['items.value'] }
        };

        it('maps reads to form fields, expands formulas and finds the empty ones', () => {
            const reads = [
                { schema: '#S', path: 'total' },
                { schema: '#S', path: 'location' },
                { schema: '#S', path: 'location.lat' },
                { schema: '#S', path: 'table.co2' },
                { schema: '#S', path: 'items.1.value' },
                { schema: '#S', path: '@context' },
                { schema: '#R', path: 'amount' }
            ];
            assert.deepEqual(resolvePreviewFields(source, reads), {
                fields: ['amount', 'items.value', 'location.lat', 'rate', 'table'],
                missingFields: ['items.value', 'rate', 'table']
            });
        });

        it('always includes the inputs of autocalculate fields', () => {
            assert.deepEqual(resolvePreviewFields(source, []).fields, ['amount', 'items.value', 'rate']);
        });

        it('stops on formulas that read each other', () => {
            const looped = { ...source, dependencies: { total: ['rate'], rate: ['total'] } };
            assert.deepEqual(resolvePreviewFields(looped, []).fields, []);
        });

        it('returns empty lists without a form source', () => {
            assert.deepEqual(resolvePreviewFields(null, [{ schema: '#S', path: 'amount' }]), { fields: [], missingFields: [] });
        });
    });
});
