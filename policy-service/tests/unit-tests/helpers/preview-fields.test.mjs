import assert from 'node:assert/strict';
import { types } from 'node:util';
import {
    calculatePreviewAutoFields,
    collectPreviewPaths,
    fillPreviewPlaceholders,
    findScriptFieldReads,
    getMathPreviewOutputPaths,
    getMathPreviewReads,
    getPreviewChangedPaths,
    getPreviewComputed,
    getPreviewSubject,
    isMissingPreviewValue,
    isPreviewComputedRead,
    isPreviewOutputRead,
    isPreviewPathCovered,
    normalizePreviewPath,
    resolvePreviewFields,
    setPreviewComputed
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

        it('records a nested field the formula reads, so the empty child is the needed field', () => {
            const fields = [
                { name: 'location', type: '#loc', isRef: true, isArray: false, fields: [field('lat', 'number')] },
                field('total', 'number', { autocalculate: true, expression: 'location.lat * 2' })
            ];
            const doc = { location: {} };
            const dependencies = {};
            calculatePreviewAutoFields(fields, doc, dependencies, []);
            assert.deepEqual(dependencies, { total: ['location', 'location.lat'] });
            const source = { schema: '#S', document: { location: {} }, paths: ['location', 'location.lat', 'total'], dependencies };
            assert.deepEqual(resolvePreviewFields(source, []), { fields: ['location.lat'], missingFields: ['location.lat'] });
        });

        it('records a field the formula reads through this', () => {
            const doc = { amount: 2 };
            const dependencies = {};
            calculatePreviewAutoFields([field('amount', 'number'), field('total', 'number', { autocalculate: true, expression: 'this.amount * 2' })], doc, dependencies, []);
            assert.equal(doc.total, 4);
            assert.deepEqual(dependencies, { total: ['amount'] });
        });

        it('stores a plain value when the formula returns a nested object', () => {
            const fields = [
                { name: 'location', type: '#loc', isRef: true, isArray: false, fields: [field('lat', 'number')] },
                field('copy', 'string', { autocalculate: true, expression: 'location' })
            ];
            const doc = { location: { lat: 1 } };
            calculatePreviewAutoFields(fields, doc, {}, []);
            assert.equal(types.isProxy(doc.copy), false);
            assert.deepEqual(structuredClone(doc), { location: { lat: 1 }, copy: { lat: 1 } });
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

    describe('getMathPreviewOutputPaths and isPreviewOutputRead', () => {
        it('lists the fields the Math block writes', () => {
            const expression = {
                variables: [],
                formulas: [],
                outputs: [
                    { type: 'link', name: 'b', description: '', field: 'total', schema: '#S' },
                    { type: 'link', name: 'c', description: '', field: 'location.lat', schema: '#S' }
                ]
            };
            assert.deepEqual(getMathPreviewOutputPaths(expression), ['total', 'location.lat']);
            assert.deepEqual(getMathPreviewOutputPaths(null), []);
        });

        it('treats a read of a written field or of a value inside it as an output read', () => {
            const outputs = ['total', 'results'];
            assert.equal(isPreviewOutputRead('total', outputs), true);
            assert.equal(isPreviewOutputRead('results.0.year', outputs), true);
            assert.equal(isPreviewOutputRead('amount', outputs), false);
            assert.equal(isPreviewOutputRead('totalCost', outputs), false);
            assert.equal(isPreviewOutputRead('total', []), false);
        });

        it('treats the read of a group on the way to a nested output as an output read', () => {
            const outputs = ['location.lat'];
            assert.equal(isPreviewOutputRead('location', outputs), true);
            assert.equal(isPreviewOutputRead('location.lat', outputs), true);
            assert.equal(isPreviewOutputRead('location.lng', outputs), false);
            assert.equal(isPreviewOutputRead('loc', outputs), false);
        });
    });

    describe('computed fields of a preview document', () => {
        it('keeps the list with the document object it was set on', () => {
            const first = setPreviewComputed({ schema: '#S' }, ['temp', 'rows.0.value', 'temp', '']);
            const second = { schema: '#S' };
            assert.deepEqual(getPreviewComputed(first), ['temp', 'rows.0.value']);
            assert.deepEqual(getPreviewComputed(second), []);
            assert.deepEqual(getPreviewComputed(null), []);
        });

        it('treats a read as computed only when every input document of that schema computed it', () => {
            const computed = setPreviewComputed({ schema: '#S' }, ['temp']);
            const plain = { schema: '#S' };
            assert.equal(isPreviewComputedRead(computed, '#S', 'temp'), true);
            assert.equal(isPreviewComputedRead(computed, '#S', 'amount'), false);
            assert.equal(isPreviewComputedRead(computed, '#R', 'temp'), false);
            assert.equal(isPreviewComputedRead([computed, plain], '#S', 'temp'), false);
            assert.equal(isPreviewComputedRead([computed, { schema: '#R' }], '#S', 'temp'), true);
            assert.equal(isPreviewComputedRead(plain, '#S', 'temp'), false);
            assert.equal(isPreviewComputedRead(null, '#S', 'temp'), false);
        });

        it('finds the leaf fields a script added or changed and ignores the ones it passed through', () => {
            const before = { amount: 2, note: 'a', location: { lat: 1, lng: 2 }, list: [1] };
            const after = { amount: 2, note: 'b', temp: 3, location: { lat: 1, lng: 5 }, list: [1, 2] };
            assert.deepEqual(getPreviewChangedPaths(before, after), ['note', 'temp', 'location.lng', 'list.1']);
            assert.deepEqual(getPreviewChangedPaths(before, null), []);
        });

        it('goes into array rows and reports only the changed leaf of a row', () => {
            const before = { items: [{ value: 1 }, {}] };
            const after = { items: [{ value: 1, total: 2 }, { total: 3 }] };
            assert.deepEqual(getPreviewChangedPaths(before, after), ['items.0.total', 'items.1.total']);
        });

        it('counts an unchanged value the script did not read as computed when reads are given', () => {
            const before = { amount: 2, temp: 0, location: { lat: 1 } };
            const after = { amount: 2, temp: 0, location: { lat: 1 } };
            assert.deepEqual(getPreviewChangedPaths(before, after, new Set(['amount', 'location'])), ['temp']);
            assert.deepEqual(getPreviewChangedPaths(before, after), []);
        });

        it('matches computed paths row by row', () => {
            assert.equal(isPreviewPathCovered('items.0.total', 'items.0.total'), true);
            assert.equal(isPreviewPathCovered('items.0.value', 'items.0.total'), false);
            assert.equal(isPreviewPathCovered('items.1.total', 'items.0.total'), false);
            assert.equal(isPreviewPathCovered('items.1.total', 'items.total'), true);
            assert.equal(isPreviewPathCovered('items.total', 'items.0.total'), false);
            assert.equal(isPreviewPathCovered('items.0.total.x', 'items.0.total'), true);
            assert.equal(isPreviewPathCovered('items', 'items.0.total'), true);
        });

        it('treats a read without a row index as computed only when every row of the document computed it', () => {
            const document = (computed) => setPreviewComputed({
                schema: '#S',
                document: { credentialSubject: [{ items: [{ value: 1 }, {}] }] }
            }, computed);
            assert.equal(isPreviewComputedRead(document(['items.0.total']), '#S', 'items.total'), false);
            assert.equal(isPreviewComputedRead(document(['items.0.total', 'items.1.total']), '#S', 'items.total'), true);
            assert.equal(isPreviewComputedRead(document(['items.0.total']), '#S', 'items.0.value'), false);
            assert.equal(isPreviewComputedRead(document(['items.0.total']), '#S', 'items.0.total'), true);
            assert.equal(isPreviewComputedRead(document(['items.total']), '#S', 'items.1.total'), true);
        });

        it('reads the first credential subject of a policy document', () => {
            assert.deepEqual(getPreviewSubject({ document: { credentialSubject: [{ a: 1 }] } }), { a: 1 });
            assert.deepEqual(getPreviewSubject({ document: { credentialSubject: { a: 2 } } }), { a: 2 });
            assert.equal(getPreviewSubject(null), undefined);
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

        it('counts a read of an unknown schema as a form read when the form has that field', () => {
            const plain = { schema: '#S', document: { amount: 2 }, paths: ['amount', 'rate'], dependencies: {} };
            const reads = [
                { schema: null, path: 'rate' },
                { schema: null, path: 'note' },
                { schema: '#R', path: 'amount' }
            ];
            assert.deepEqual(resolvePreviewFields(plain, reads), { fields: ['rate'], missingFields: ['rate'] });
        });

        it('returns empty lists without a form source', () => {
            assert.deepEqual(resolvePreviewFields(null, [{ schema: '#S', path: 'amount' }]), { fields: [], missingFields: [] });
        });
    });
});
