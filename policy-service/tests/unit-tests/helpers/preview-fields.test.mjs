import { PreviewReadTracker } from '../../../dist/policy-engine/helpers/workers/preview-read-tracker.js';
import { findPreviewScriptFields } from '../../../dist/policy-engine/helpers/preview-script-fields.js';
import assert from 'node:assert/strict';
import { types } from 'node:util';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { assertPreviewCalculationResult, calculatePreviewAutoFields, collectPreviewNullPaths, collectPreviewUnavailablePaths, collectPreviewPaths, fillPreviewPlaceholders, getMathPreviewOutputPaths, getMathPreviewReads, getPreviewChangedPaths, getPreviewComputed, getPreviewDocumentPaths, evaluatePreviewSwitchFormula, getPreviewSubject, isMissingPreviewValue, isPreviewComputedRead, isPreviewOutputRead, isPreviewPathCovered, normalizePreviewPath, markPreviewExtractedDocument, markPreviewStoredDocuments, PreviewScope, removePreviewEmptyValues, resolvePreviewDocumentRead, resolvePreviewFields, setPreviewComputed, setPreviewDocumentSchema, trackPreviewFormulaScope } from '../../../dist/policy-engine/helpers/preview.js';

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

        it('computes the fields and records what each formula reads', async () => {
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

        for (const amount of [5, 200]) {
            it(`discovers only the conditional expression branch that runs before submission for amount=${amount}`, async () => {
                const fields = [field('amount', 'number'), field('rate', 'number'), field('discount', 'number'),
                    field('unused', 'number'), field('total', 'number', { autocalculate: true,
                        expression: 'amount > 100 ? amount * rate : amount - discount' })];
                const doc = { amount, rate: 2, discount: 1 };
                const dependencies = {};
                const errors = [];
                calculatePreviewAutoFields(fields, doc, dependencies, errors, '', true);
                assert.equal(doc.total, amount > 100 ? amount * 2 : amount - 1);
                assert.deepEqual(errors, []);
                assert.deepEqual(resolvePreviewFields({ schema: '#S', document: { amount },
                    paths: collectPreviewPaths(fields), dependencies }, []),
                    amount > 100 ? { fields: ['amount', 'rate'], missingFields: ['rate'] } : { fields: ['amount', 'discount'], missingFields: ['discount'] });
            });
        }

        it('finds a constructed key once its branch runs and ignores a local name like a field', async () => {
            const fields = [field('amount', 'number'), field('rate', 'number'), field('unused', 'number'),
                field('total', 'number', { autocalculate: true,
                    expression: "amount > 100 ? amount * this['ra' + 'te'] : amount" })];
            const doc = { amount: 5 };
            const dependencies = {};
            calculatePreviewAutoFields(fields, doc, dependencies, [], '', true);
            assert.equal(doc.total, 5);
            assert.deepEqual(dependencies.total, ['amount']);
            const large = { amount: 200, rate: 2 };
            const largeDependencies = {};
            calculatePreviewAutoFields(fields, large, largeDependencies, [], '', true);
            assert.equal(large.total, 400);
            assert.deepEqual(largeDependencies.total.sort(), ['amount', 'rate']);
            fields[3].expression = "(() => {const rate=2;const label='unused';return amount*rate})()";
            const localDependencies = {};
            calculatePreviewAutoFields(fields, doc, localDependencies, [], '', true);
            assert.equal(doc.total, 10);
            assert.deepEqual(localDependencies.total, ['amount']);
        });

        for (const expression of [
            '(() => {let x=amount;while(true){x=x/2;if(x<1)break}return x*rate})()',
            '(() => {let x=amount;for(;;){x=x/2;if(x<1)break}return x*rate})()',
            '(() => {function fact(n){return n<2?1:n*fact(n-1)}return fact(amount)*rate})()',
        ]) {
            it(`continues autocalculate discovery after data-dependent control flow: ${expression}`, async () => {
                const fields = [field('amount', 'number'), field('rate', 'number'), field('discount', 'number'),
                    field('unused', 'number'), field('total', 'number', { autocalculate: true, expression }),
                    field('next', 'number', { autocalculate: true, expression: 'discount*2' })];
                const doc = { amount: 5, rate: 2, discount: 3 };
                const dependencies = {};
                const errors = [];
                calculatePreviewAutoFields(fields, doc, dependencies, errors, '', true);
                assert.deepEqual(errors, []);
                assert.ok(Number.isFinite(doc.total));
                assert.equal(doc.next, 6);
                assert.deepEqual(dependencies.total.sort(), ['amount', 'rate']);
                assert.deepEqual(dependencies.next, ['discount']);
            });
        }

        it('does not count a field an expression takes from a copy of the document', async () => {
            const fields = [field('amount', 'number'), field('unused', 'number'),
                field('total', 'number', { autocalculate: true, expression: 'Object.assign({}, this).amount*2' })];
            const doc = { amount: 5, unused: 99 };
            const dependencies = {};
            calculatePreviewAutoFields(fields, doc, dependencies, [], '', true);
            assert.equal(doc.total, 10);
            assert.deepEqual(dependencies.total, []);
        });

        it('discovers the finite schema matches for input-dependent autocalculate keys', async () => {
            const fields = ['count', 'year1', 'year2', 'year3', 'unused'].map(name => field(name, 'number'));
            fields.push(field('total', 'number', { autocalculate: true,
                expression: "(() => {let sum=0;for(let i=1;i<=count;i++)sum+=this['year'+i];return sum})()" }));
            const doc = { count: 3, year1: 10, year2: 20, year3: 30 };
            const dependencies = {};
            calculatePreviewAutoFields(fields, doc, dependencies, [], '', true);
            assert.equal(doc.total, 60);
            assert.deepEqual(dependencies.total.sort(), ['count', 'year1', 'year2', 'year3']);
        });

        for (const [expression, expectedFields, expectedTotal] of [["Object.values(this)[0]*2", [], 10], ["Object.entries(this)[0][1]*2", [], 10], ["Object.keys({...this}).length", [], 5], ["JSON.stringify(this).length", [], 58], ["(() => {const c={...this};this.rate=2;return c.rate*this.amount})()", ["amount"], 15]]) {
            it(`requires a field read by a whole-object operation only when its name is used: ${expression}`, async () => {
                const fields = ['amount', 'rate', 'discount', 'unused', 'kind'].map(name => field(name, 'number'));
                fields.push(field('total', 'number', { autocalculate: true, expression }));
                const doc = { amount: 5, rate: 3, discount: 1, unused: 99, kind: 'te' };
                const dependencies = {};
                const errors = [];
                calculatePreviewAutoFields(fields, doc, dependencies, errors, '', true);
                assert.deepEqual(errors, []);
                assert.deepEqual(dependencies.total.sort(), expectedFields);
                assert.equal(doc.total, expectedTotal);
            });
        }

        for (const preparation of ['', 'const c={...this};']) {
            it(`retains the same-expression input after many literals: ${preparation}`, async () => {
                const items = new Array(100010).fill('0').join(',');
                const expression = preparation ? `(() => {${preparation}return [${items}].length*c.rate})()` : `[${items}].length*rate`;
                const fields = [field('amount', 'number'), field('rate', 'number'), field('unused', 'number'),
                    field('total', 'number', { autocalculate: true, expression })];
                const doc = { amount: 5, rate: 2, unused: 99 };
                const dependencies = {};
                const errors = [];
                calculatePreviewAutoFields(fields, doc, dependencies, errors, '', true);
                assert.deepEqual(errors, []);
                assert.deepEqual(dependencies.total, preparation ? [] : ['rate']);
                assert.equal(doc.total, 200020);
            });
        }

        for(const [expression,expectedFields,expectedTotal] of [
        ["(() => {const log=()=>{};log(JSON.stringify(this).replaceAll('a','b'));return amount*2})()", ["amount"], 10],
        ["(() => {const log=()=>{};log(JSON.stringify(this).split(',').join(';'));return amount*2})()", ["amount"], 10],
        ["JSON.stringify(this,['amount']).length", [], 12],
        ["(() => {const log=()=>{};log(JSON.stringify(this).length*2);return amount*2})()", ["amount"], 10],
        ["(() => {const log=()=>{};log(JSON.stringify(this).includes('a'));return amount*2})()", ["amount"], 10],
        ["JSON.stringify(this).replaceAll('a','b').length", [], 58],
        ["JSON.stringify(this).split(',').join(';').length", [], 58],
        ["JSON.stringify(this,[]).length", [], 2],
        ["Number(JSON.stringify(this,['amount']).length)*2", [], 24],
    ]){
            it(`does not require fields that only serialized or logged JSON reads: ${expression}`,async ()=>{
                const fields=['amount','rate','discount','unused','kind'].map(name=>field(name,'number'));
                fields.push(field('total','number',{autocalculate:true,expression}));
                const doc={amount:5,rate:3,discount:1,unused:99,kind:'te'},dependencies={},errors=[];
                calculatePreviewAutoFields(fields,doc,dependencies,errors,'',true);
                assert.deepEqual(errors,[]);
                assert.deepEqual(dependencies.total.sort(),expectedFields);
                assert.equal(doc.total,expectedTotal);
            });
        }
        it('retains the late input after four nested autocalculate loops',async ()=>{
            const loops='let s=0;'+Array.from({length:4},(_,i)=>`for(let i${i}=0;i${i}<32;i${i}++){`).join('')+'s++;'+'}'.repeat(4);
            const fields=[field('amount','number'),field('rate','number'),field('unused','number'),field('total','number',{autocalculate:true,expression:'(() => {'+loops+'return s*rate})()'})];
            const doc={amount:5,rate:2,unused:99},dependencies={},errors=[];
            calculatePreviewAutoFields(fields,doc,dependencies,errors,'',true);
            assert.deepEqual(errors,[]);
            assert.deepEqual(dependencies.total,['rate']);
            assert.equal(doc.total,2097152);
        });

        it('removes empty strings and nulls the way the form does and keeps zero and false', () => {
            const value = { a: '', b: null, c: 0, d: false, e: [1, '', null, { x: '' }], f: { g: null, h: 'y' } };
            removePreviewEmptyValues(value);
            assert.deepEqual(value, { c: 0, d: false, e: [1, {}], f: { h: 'y' } });
        });

        it('does not count a field copied from the document by its name in an expression', async () => {
            const fields = [field('flag', 'boolean'), field('rate', 'number'),
                field('total', 'number', { autocalculate: true, expression: '(() => { const c = { ...this }; return c.flag ? c.rate : 1; })()' })];
            for (const flag of [false, true]) {
                const doc = { flag, rate: 7 };
                const dependencies = {};
                calculatePreviewAutoFields(fields, doc, dependencies, [], '', true);
                assert.equal(doc.total, flag ? 7 : 1);
                assert.ok(!(dependencies.total || []).includes('rate'));
            }
            const direct = [field('flag', 'boolean'), field('rate', 'number'),
                field('total', 'number', { autocalculate: true, expression: 'flag ? rate : 1' })];
            for (const flag of [false, true]) {
                const dependencies = {};
                calculatePreviewAutoFields(direct, { flag, rate: 7 }, dependencies, [], '', true);
                assert.deepEqual(dependencies.total, flag ? ['flag', 'rate'] : ['flag']);
            }
        });

        it('does not require nested array fields of an expression branch that did not run', async () => {
            const fields = [field('amount', 'number'),
                { name: 'items', isRef: true, isArray: true, fields: [field('value', 'number')] },
                field('total', 'number', { autocalculate: true,
                    expression: 'amount > 100 ? items.reduce((sum, row) => sum + row.value, 0) : amount' })];
            const doc = { amount: 5, items: [] };
            const dependencies = {};
            calculatePreviewAutoFields(fields, doc, dependencies, [], '', true);
            assert.equal(doc.total, 5);
            assert.deepEqual(resolvePreviewFields({ schema: '#S', document: { amount: 5, items: [] },
                paths: collectPreviewPaths(fields), dependencies }, []),
                { fields: ['amount'], missingFields: [] });
        });

        it('requires only the inputs of the branch that ran in real preview and keeps the ordinary value', async () => {
            const fields = [field('amount', 'number'), field('rate', 'number'),
                field('total', 'number', { autocalculate: true, expression: 'amount > 100 ? amount * rate : amount' })];
            const doc = { amount: 5 };
            const dependencies = {};
            const errors = [];
            calculatePreviewAutoFields(fields, doc, dependencies, errors);
            assert.equal(doc.total, PolicyUtils.autoCalculateField(fields[2], { amount: 5 }));
            assert.deepEqual(errors, []);
            assert.deepEqual(dependencies.total, ['amount']);
        });

        it('keeps the ordinary expression failure on a missing input and records that input', async () => {
            const doc = { amount: 2 };
            const dependencies = {};
            const errors = [];
            assert.throws(() => PolicyUtils.autoCalculateField(autoFields[2], { ...doc }), /Invalid expression/);
            calculatePreviewAutoFields(autoFields, doc, dependencies, errors);
            assert.equal('total' in doc, false);
            assert.deepEqual(dependencies.total, ['amount', 'rate']);
            assert.deepEqual(errors, ['Invalid expression: total']);
        });

        it('rejects the reviewed amount * 2 + bonus formula exactly as ordinary evaluation does', async () => {
            const fields = [field('amount', 'number'), field('bonus', 'number'),
                field('total', 'number', { autocalculate: true, expression: 'amount * 2 + bonus' })];
            const doc = { amount: 2 };
            const dependencies = {};
            const errors = [];
            assert.throws(() => PolicyUtils.autoCalculateField(fields[2], { ...doc }), /Invalid expression/);
            calculatePreviewAutoFields(fields, doc, dependencies, errors);
            assert.deepEqual(doc, { amount: 2 });
            assert.deepEqual(errors, ['Invalid expression: total']);
            assert.deepEqual(resolvePreviewFields({ schema: '#S', document: { amount: 2 },
                paths: ['amount', 'bonus', 'total'], dependencies }, []),
            { fields: ['amount', 'bonus'], missingFields: ['bonus'] });
            const complete = { amount: 2, bonus: 3 };
            calculatePreviewAutoFields(fields, complete, {}, []);
            assert.equal(complete.total, PolicyUtils.autoCalculateField(fields[2], { amount: 2, bonus: 3 }));
        });

        it('keeps incomplete discovery permissive and propagates its mode into nested formulas', async () => {
            const doc = { amount: 2, items: [{}] };
            const dependencies = {};
            const errors = [];
            calculatePreviewAutoFields(autoFields, doc, dependencies, errors, '', true);
            assert.ok(Number.isNaN(doc.total));
            assert.ok(Number.isNaN(doc.items[0].double));
            assert.deepEqual(dependencies, { total: ['amount', 'rate'], 'items.double': ['items.value'] });
            assert.deepEqual(errors, []);
            errors.length = 0;
            const real = { amount: 2, rate: 3, items: [{}] };
            calculatePreviewAutoFields(autoFields, real, {}, errors);
            assert.equal('double' in real.items[0], false);
            assert.deepEqual(errors, ['Invalid expression: items.double']);
        });

        it('keeps ordinary values and does not require a presence-checked field or a summed empty list', async () => {
            const fields = [field('amount', 'number'), field('bonus', 'number'), field('rows', 'number', { isArray: true }),
                field('total', 'number', { autocalculate: true,
                    expression: "typeof bonus === 'undefined' ? amount * 2 : amount * 2 + bonus" }),
                field('sum', 'number', { autocalculate: true, expression: 'this.rows.reduce((sum, row) => sum + row, 0)' })];
            const document = { amount: 5, rows: [] };
            const dependencies = {};
            const errors = [];
            calculatePreviewAutoFields(fields, document, dependencies, errors);
            assert.equal(document.total, PolicyUtils.autoCalculateField(fields[3], { amount: 5, rows: [] }));
            assert.equal(document.total, 10);
            assert.equal(document.sum, 0);
            assert.deepEqual(errors, []);
            assert.deepEqual(resolvePreviewFields({ schema: '#S', document: { amount: 5, rows: [] },
                paths: ['amount', 'bonus', 'rows', 'total', 'sum'], dependencies }, []).missingFields, []);
        });

        it('rejects non-finite calculated values before JSON can turn them into null', async () => {
            for (const expression of ['this.bonus * 2', '0 / 0', '1 / 0']) {
                const fields = [field('bonus', 'number'), field('total', 'number', { autocalculate: true, expression })];
                const document = {};
                const errors = [];
                calculatePreviewAutoFields(fields, document, {}, errors);
                assert.equal('total' in document, false);
                assert.deepEqual(errors, ['Invalid expression: total']);
            }
            assert.throws(() => assertPreviewCalculationResult({ rows: [{ total: NaN }] }), /non-finite/);
            assert.doesNotThrow(() => assertPreviewCalculationResult({ rows: [], zero: 0, flag: false, missing: undefined }));
        });

        it('collects a broken formula as an error and leaves the field unset', async () => {
            const doc = { amount: 2, total: 1 };
            const errors = [];
            calculatePreviewAutoFields([field('amount', 'number'), field('total', 'number', { autocalculate: true, expression: 'amount *' })], doc, {}, errors);
            assert.equal('total' in doc, false);
            assert.deepEqual(errors, ['Invalid expression: total']);
        });

        it('records a nested field the formula reads, so the empty child is the needed field', async () => {
            const fields = [
                { name: 'location', type: '#loc', isRef: true, isArray: false, fields: [field('lat', 'number')] },
                field('total', 'number', { autocalculate: true, expression: 'location.lat * 2' })
            ];
            const doc = { location: {} };
            const dependencies = {};
            calculatePreviewAutoFields(fields, doc, dependencies, []);
            assert.deepEqual(dependencies, { total: ['location.lat'] });
            const source = { schema: '#S', document: { location: {} }, paths: ['location', 'location.lat', 'total'], dependencies };
            assert.deepEqual(resolvePreviewFields(source, []), { fields: ['location.lat'], missingFields: ['location.lat'] });
        });

        it('records a field the formula reads through this', async () => {
            const doc = { amount: 2 };
            const dependencies = {};
            calculatePreviewAutoFields([field('amount', 'number'), field('total', 'number', { autocalculate: true, expression: 'this.amount * 2' })], doc, dependencies, []);
            assert.equal(doc.total, 4);
            assert.deepEqual(dependencies, { total: ['amount'] });
        });

        it('does not require a field the formula only checks or defaults', async () => {
            const fields = [field('amount', 'number'), field('bonus', 'number'), field('rate', 'number'),
                field('total', 'number', { autocalculate: true, expression: "amount + (bonus || 0) + (rate ?? 1) + (typeof unit === 'string' ? 1 : 0)" })];
            const dependencies = {};
            calculatePreviewAutoFields([...fields, field('unit', 'string')], { amount: 1 }, dependencies, [], '', true);
            assert.deepEqual(dependencies.total, ['amount']);
        });

        it('stores a plain value when the formula returns a nested object', async () => {
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
                { schema: '#S', path: 'amount', link: null },
                { schema: '#R', path: 'rate', link: '#R' }
            ]);
        });

        it('returns nothing without an expression', () => {
            assert.deepEqual(getMathPreviewReads(null, '#S'), []);
        });
    });

    describe('evaluatePreviewSwitchFormula', () => {
        for (const formula of ['true ? amount[1] > 0 : amount[2] > 0', 'false ? amount[2] > 0 : amount[1] > 0', 'i=1; amount[i] > 0']) {
            it(`records only executed indexes: ${formula}`, () => {
                const reads = [];
                const result = evaluatePreviewSwitchFormula(formula, { amount: [5, undefined] }, (key, index) => reads.push([key, index]));
                assert.notEqual(result, 'Incorrect formula');
                assert.deepEqual(reads, [['amount', 0]]);
            });
        }
        for (const [formula, selected] of [
            ['sum(amount[1:2])', [0, 1]],
            ['sum(amount[[2,1,2]])', [1, 0, 1]],
            ['sum(amount[1:end-1])', [0, 1]],
            ['sum(amount[1:2:3])', [0, 2]]
        ]) {
            it(`records selected range or list elements: ${formula}`, () => {
                const reads = [];
                const scope = { amount: [5, 7, 9] };
                const result = evaluatePreviewSwitchFormula(formula, scope, (key, index) => reads.push([key, index]));
                assert.equal(result, PolicyUtils.evaluateCustomFormula(formula, { amount: [5, 7, 9] }));
                assert.deepEqual(reads, selected.map(index => ['amount', index]));
            });
        }
        it('records whole-array operations', () => {
            const reads = [];
            assert.equal(evaluatePreviewSwitchFormula('sum(amount)', { amount: [5, 7] }, (key, index) => reads.push([key, index])), 12);
            assert.deepEqual(reads, [['amount', null]]);
        });
    });

    describe('resolvePreviewDocumentRead and getPreviewDocumentPaths', () => {
        const step = () => {
            const actionStatus = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            actionStatus.setPreviewSource({ schema: '#P', document: {}, paths: ['section', 'section.amount', 'rows', 'rows.amount', 'other'], dependencies: {} });
            return actionStatus;
        };
        const doc = (subject, schema) => setPreviewDocumentSchema({ document: { credentialSubject: [subject] } }, schema);

        it('translates a read of an extracted document back to its original indexed path', async () => {
            await PreviewScope.run(step(), async () => {
                const parent = doc({ rows: [{}, {}] }, '#P');
                const child = markPreviewExtractedDocument(doc({}, null), parent, 'rows.1');
                assert.deepEqual(resolvePreviewDocumentRead(child, 'amount'), { schema: '#P', path: 'rows.1.amount' });
                assert.deepEqual(getPreviewDocumentPaths(child, ['section.amount', 'rows', 'rows.amount', 'other']), ['amount']);
                assert.deepEqual(getPreviewDocumentPaths(parent, ['rows.amount']), ['rows.amount']);
            });
        });

        it('drops reads of stored records and of fields calculated on the document or before extraction', async () => {
            await PreviewScope.run(step(), async () => {
                assert.equal(resolvePreviewDocumentRead(markPreviewStoredDocuments(doc({}, '#P')), 'other'), null);
                assert.equal(resolvePreviewDocumentRead(setPreviewComputed(doc({}, '#P'), ['other']), 'other'), null);
                const parent = setPreviewComputed(doc({ section: {} }, '#P'), ['section.amount']);
                assert.equal(resolvePreviewDocumentRead(markPreviewExtractedDocument(doc({}, null), parent, 'section'), 'amount'), null);
                assert.deepEqual(resolvePreviewDocumentRead(doc({}, null), 'other'), { schema: null, path: 'other' });
            });
        });

        it('leaves documents unmarked outside Preview', () => {
            const child = markPreviewExtractedDocument(doc({}, null), doc({}, '#P'), 'section');
            assert.deepEqual(resolvePreviewDocumentRead(child, 'amount'), { schema: null, path: 'amount' });
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

    describe('runtime mathjs reads through the shared tracker', () => {
        it('evaluates once and keeps only the full path of the branch that ran', () => {
            const formula = '(flag ? owner : buyer).name';
            const paths = ['flag', 'owner', 'owner.name', 'buyer', 'buyer.name'];
            const tracker = new PreviewReadTracker();
            tracker.configure(formula);
            let calls = 0;
            const document = { flag: true, owner: { get name() { calls++; return 'Ivan'; } }, buyer: { name: '' } };
            const value = PolicyUtils.evaluateCustomFormula(formula, tracker.track(document, '#S'));
            assert.equal(value, 'Ivan');
            assert.ok(calls > 0);
            const sites = tracker.takeSites();
            assert.ok(sites.some((read) => read.path === 'owner.name'));
            const reads = findPreviewScriptFields(formula, sites, [], '#S', paths, false, '', [], 'mathjs');
            assert.deepEqual([...new Set(reads.map((read) => read.path))].sort(), ['flag', 'owner.name']);
        });

        it('retains an indexed runtime address together with the schema path', () => {
            const formula = '(rows[2]).name';
            const tracker = new PreviewReadTracker();
            tracker.configure(formula);
            const scope = tracker.track({ rows: [{ name: 'first' }, { name: '' }] }, '#S');
            assert.equal(PolicyUtils.evaluateCustomFormula(formula, scope), '');
            const reads = findPreviewScriptFields(formula, tracker.takeSites(), [], '#S', ['rows', 'rows.name'], false, '', [], 'mathjs');
            assert.ok(reads.some((read) => read.fullPath === 'rows.1.name'));
        });
    });

    describe('mathjs through findPreviewScriptFields', () => {
        const findFormulaFieldReads = (formula, source, scope = {}) => {
            if (!source) {
                return [];
            }
            const tracker = new PreviewReadTracker();
            tracker.configure(formula);
            PolicyUtils.evaluateCustomFormula(formula, trackPreviewFormulaScope(tracker, structuredClone(scope), source.schema, source.paths));
            return findPreviewScriptFields(formula, tracker.takeSites(), [], source.schema, source.paths, false, '', [], 'mathjs')
                .map((read) => read.path).sort();
        };
        const source = { schema: '#S', document: {}, paths: ['amount', 'owner', 'owner.name', 'buyer', 'buyer.name', 'rows', 'rows.value', 'sum', 'pi'], dependencies: {} };

        it('finds the fields a condition read by their full path', () => {
            assert.deepEqual(findFormulaFieldReads('owner.name == "x" and amount > 2', source, { owner: { name: 'x' }, amount: 5 }), ['amount', 'owner.name']);
        });

        it('does not take a field of another section with the same last name', () => {
            assert.deepEqual(findFormulaFieldReads('owner.name == "Ivan"', source, { owner: { name: 'Ivan' }, buyer: { name: 'x' } }), ['owner.name']);
        });

        it('does not take a field name written inside quotes', () => {
            assert.deepEqual(findFormulaFieldReads('owner.name == "amount"', source, { owner: { name: 'a' }, amount: 1 }), ['owner.name']);
        });

        it('leaves array indexes out of the path', () => {
            assert.deepEqual(findFormulaFieldReads('rows[1].value > 0', source, { rows: [{ value: 1 }] }), ['rows.value']);
        });

        it('finds an absent field the formula asked for and skips the part that did not run', () => {
            assert.deepEqual(findFormulaFieldReads('amount > 2', source), ['amount']);
            assert.deepEqual(findFormulaFieldReads('amount > 2 and owner.name == "x"', source, { amount: 1 }), ['amount']);
        });

        it('keeps mathjs built-ins that the data does not supply', () => {
            assert.deepEqual(findFormulaFieldReads('sum([1, 2]) > pi', source), []);
            assert.deepEqual(findFormulaFieldReads('pi > 2', source, { pi: 5 }), ['pi']);
        });

        it('returns nothing without a form source or for a formula that cannot be parsed', () => {
            assert.deepEqual(findFormulaFieldReads('amount', null), []);
            assert.deepEqual(findFormulaFieldReads('amount ==', source), []);
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

describe('@unit null preview fields', () => {
    const fields = [field('title', 'null'), field('amount', 'number'),
        { name: 'section', isRef: true, fields: [field('unit', 'null'), field('value', 'number')] },
        { name: 'rows', isRef: true, isArray: true, fields: [field('heading', 'null'), field('unit', 'number')] }];
    const source = (document = {}) => ({ schema: '#S', document, paths: collectPreviewPaths(fields),
        nulls: collectPreviewNullPaths(fields), dependencies: {} });

    it('collects display-only paths in nested schemas and tables without removing known paths', () => {
        assert.deepEqual(collectPreviewNullPaths(fields), ['title', 'section.unit', 'rows.heading']);
        assert.deepEqual(collectPreviewNullPaths(fields, 'input.'), ['input.title', 'input.section.unit', 'input.rows.heading']);
        assert.ok(collectPreviewPaths(fields).includes('section.unit'));
        assert.deepEqual(collectPreviewNullPaths(undefined), []);
    });

    it('excludes null headings without replacing a read with its parent section', () => {
        const reads = ['title', 'section.unit', 'rows.0.heading'].map(path => ({ schema: '#S', path }));
        assert.deepEqual(resolvePreviewFields(source(), reads), { fields: [], missingFields: [] });
    });

    it('still requires a numeric column with the same leaf name as a null heading', () => {
        const reads = ['section.unit', 'rows.1.unit'].map(path => ({ schema: '#S', path }));
        assert.deepEqual(resolvePreviewFields(source({ rows: [{ unit: 0 }, {}] }), reads),
            { fields: ['rows.unit'], missingFields: ['rows.unit'] });
        assert.deepEqual(resolvePreviewFields(source({ rows: [{}] }), reads),
            { fields: ['rows.unit'], missingFields: ['rows.unit'] });
    });

    it('keeps an explicitly read section required after discarding its null child', () => {
        const reads = ['section', 'section.unit'].map(path => ({ schema: '#S', path }));
        assert.deepEqual(resolvePreviewFields(source(), reads), { fields: ['section'], missingFields: ['section'] });
    });

    it('excludes a null dependency while retaining real autocalculate dependencies', () => {
        const input = source({ amount: 0 });
        input.dependencies.total = ['amount', 'title'];
        input.paths.push('total');
        assert.deepEqual(resolvePreviewFields(input, [{ schema: '#S', path: 'total' }]),
            { fields: ['amount'], missingFields: [] });
    });
});

describe('@unit preview form condition priority', () => {
    const mode = field('mode', 'string');
    const rate = field('rate', 'number');
    const rows = field('rows', '#row', { isRef: true, isArray: true, fields: [rate] });
    const condition = { ifCondition: { field: mode, fieldValue: 'enabled' }, thenFields: [rate], elseFields: [] };
    const source = (document, fields, conditions) => ({ schema: '#S', document,
        paths: collectPreviewPaths(fields), dependencies: {},
        unavailable: collectPreviewUnavailablePaths(fields, conditions, document) });
    const reads = [{ schema: '#S', path: 'rate' }];

    it('never requires a scalar field hidden by its condition', () => {
        assert.deepEqual(resolvePreviewFields(source({ mode: 'disabled' }, [mode, rate], [condition]), reads),
            { fields: [], missingFields: [] });
    });

    it('still requires an allowed configured input and accepts zero', () => {
        assert.deepEqual(resolvePreviewFields(source({ mode: 'enabled' }, [mode, rate], [condition]), reads),
            { fields: ['rate'], missingFields: ['rate'] });
        assert.deepEqual(resolvePreviewFields(source({ mode: 'enabled', rate: 0 }, [mode, rate], [condition]), reads),
            { fields: ['rate'], missingFields: [] });
    });

    it('uses shared reachability when the predicate itself was never revealed', () => {
        const parent = { ifCondition: { field: field('show', 'boolean'), fieldValue: true }, thenFields: [mode], elseFields: [] };
        assert.deepEqual(resolvePreviewFields(source({ show: false, mode: 'enabled' }, [mode, rate], [parent, condition]), reads),
            { fields: [], missingFields: [] });
    });

    it('keeps a field allowed when both branches reveal it', () => {
        assert.deepEqual(resolvePreviewFields(source({ mode: 'disabled' }, [mode, rate], [{ ...condition, elseFields: [rate] }]), reads),
            { fields: ['rate'], missingFields: ['rate'] });
    });

    it('excludes every child of a forbidden cross-schema section', () => {
        const section = field('section', '#section', { isRef: true, fields: [rows] });
        const cross = { ...condition, thenFields: [], thenTargets: [{ field: rows, fieldPath: ['section', 'rows'] }] };
        assert.deepEqual(resolvePreviewFields(source({ mode: 'disabled', section: {} }, [mode, section], [cross]),
            [{ schema: '#S', path: 'section.rows.rate' }]), { fields: [], missingFields: [] });
    });

    it('evaluates nested sub-schema conditions against their own data', () => {
        const section = field('section', '#section', { isRef: true, fields: [mode, rate], conditions: [condition] });
        const current = source({ section: { mode: 'disabled' } }, [section], []);
        assert.deepEqual(current.unavailable, ['section.rate']);
        assert.deepEqual(resolvePreviewFields(current, [{ schema: '#S', path: 'section.rate' }]), { fields: [], missingFields: [] });
    });

    it('keeps permitted rows required when another row disables the same field', () => {
        const table = { ...rows, fields: [mode, rate], conditions: [condition] };
        const current = source({ rows: [{ mode: 'disabled' }, { mode: 'enabled' }] }, [table], []);
        assert.deepEqual(current.unavailable, ['rows.0.rate']);
        assert.deepEqual(resolvePreviewFields(current, [{ schema: '#S', path: 'rows.rate' }]),
            { fields: ['rows.rate'], missingFields: ['rows.rate'] });
    });

    it('scopes cross-schema predicates to the matching table row', () => {
        const cross = { ifCondition: { field: mode, fieldPath: ['rows', 'mode'], fieldValue: 'enabled' },
            thenFields: [], elseFields: [], thenTargets: [{ field: rate, fieldPath: ['rows', 'rate'] }] };
        const current = source({ rows: [{ mode: 'disabled' }, { mode: 'enabled', rate: 0 }] }, [{ ...rows, fields: [mode, rate] }], [cross]);
        assert.deepEqual(current.unavailable, ['rows.0.rate']);
        assert.deepEqual(resolvePreviewFields(current, [{ schema: '#S', path: 'rows.rate' }]),
            { fields: ['rows.rate'], missingFields: [] });
    });

    it('does not return empty-table hints that disagree with indexed input validation', () => {
        assert.deepEqual(resolvePreviewFields(source({ rows: [] }, [rows], []), [{ schema: '#S', path: 'rows.rate' }]),
            { fields: ['rows.rate'], missingFields: [] });
    });

    it('does not expand dependencies of a forbidden autocalculated field', () => {
        const current = source({ mode: 'disabled' }, [mode, rate, field('amount', 'number')], [condition]);
        current.dependencies.rate = ['amount'];
        assert.deepEqual(resolvePreviewFields(current, []), { fields: [], missingFields: [] });
    });
});
