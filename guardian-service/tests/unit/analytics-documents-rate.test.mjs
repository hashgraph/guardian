import assert from 'node:assert/strict';
import { DocumentsRate } from '../../dist/analytics/compare/rates/documents-rate.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

const prop = (key, value, overrides = {}) => ({
    name: key,
    path: key,
    key,
    lvl: 1,
    value,
    ignored: false,
    equal(other) { return this.value === other.value; },
    ignore() { return this.ignored; },
    getPropList() { return overrides.subProps || []; },
    toObject() { return { name: this.name, path: this.path, value: this.value }; },
    ...overrides,
});

const fakeDoc = (overrides = {}) => ({
    type: 'VC',
    key: 'schema-A',
    fields: overrides.fields || [],
    options: overrides.options || [],
    getFieldsList() { return this.fields; },
    getOptionsList() { return this.options; },
    ...overrides,
});

describe('DocumentsRate construction', () => {
    it('exposes static rate-name constants', () => {
        assert.equal(DocumentsRate.DOCUMENTS_RATE, 'documents');
        assert.equal(DocumentsRate.OPTIONS_RATE, 'options');
    });

    it('captures documentType and schema from the left document', () => {
        const a = fakeDoc({ type: 'VC', key: 'schema-X' });
        const b = fakeDoc({ type: 'VC', key: 'schema-Y' });
        const r = new DocumentsRate(a, b);
        assert.equal(r.documentType, 'VC');
        assert.equal(r.schema, 'schema-X');
    });

    it('falls back to the right document when left is missing', () => {
        const b = fakeDoc({ type: 'VP', key: 'schema-Z' });
        const r = new DocumentsRate(null, b);
        assert.equal(r.documentType, 'VP');
        assert.equal(r.schema, 'schema-Z');
    });

    it('throws "Empty document model" when both sides are null', () => {
        assert.throws(() => new DocumentsRate(null, null), /Empty document model/);
    });
});

describe('DocumentsRate.calc — both documents', () => {
    it('100% match when fields and options are identical', () => {
        const fields = [prop('amount', 1), prop('owner', 'did:1')];
        const options = [prop('opt1', 'X')];
        const a = fakeDoc({ fields, options });
        const b = fakeDoc({
            fields: [prop('amount', 1), prop('owner', 'did:1')],
            options: [prop('opt1', 'X')],
        });
        const r = new DocumentsRate(a, b);
        r.calc(opts);
        assert.equal(r.documentRate, 100);
        assert.equal(r.optionsRate, 100);
        assert.equal(r.totalRate, 100);
    });

    it('marks differing options independently of differing fields', () => {
        const a = fakeDoc({
            fields: [prop('amount', 1)],
            options: [prop('opt1', 'X')],
        });
        const b = fakeDoc({
            fields: [prop('amount', 2)],
            options: [prop('opt1', 'X')],
        });
        const r = new DocumentsRate(a, b);
        r.calc(opts);
        assert.equal(r.documentRate, 0);
        assert.equal(r.optionsRate, 100);
        assert.equal(r.totalRate, 50);
    });

    it('emits LEFT-only entries when right is missing', () => {
        const a = fakeDoc({ fields: [prop('amount', 1)] });
        const r = new DocumentsRate(a, null);
        r.calc(opts);
        // only-one-side: documentRate stays at -1
        assert.equal(r.documentRate, -1);
    });
});

describe('DocumentsRate.getSubRate / getRateValue', () => {
    it('getSubRate("documents") returns the documents rates array', () => {
        const a = fakeDoc({ fields: [prop('a', 1)] });
        const b = fakeDoc({ fields: [prop('a', 1)] });
        const r = new DocumentsRate(a, b);
        r.calc(opts);
        assert.equal(r.getSubRate('documents'), r.documents);
    });

    it('getSubRate("options") returns the options rates array', () => {
        const a = fakeDoc({ options: [prop('o', 1)] });
        const b = fakeDoc({ options: [prop('o', 1)] });
        const r = new DocumentsRate(a, b);
        r.calc(opts);
        assert.equal(r.getSubRate('options'), r.options);
    });

    it('getSubRate(other) returns null', () => {
        const a = fakeDoc();
        const b = fakeDoc();
        const r = new DocumentsRate(a, b);
        assert.equal(r.getSubRate('unknown'), null);
    });

    it('getRateValue("documents")/("options") return the named rates', () => {
        const a = fakeDoc({ fields: [prop('a', 1)], options: [prop('o', 'X')] });
        const b = fakeDoc({ fields: [prop('a', 1)], options: [prop('o', 'X')] });
        const r = new DocumentsRate(a, b);
        r.calc(opts);
        assert.equal(r.getRateValue('documents'), 100);
        assert.equal(r.getRateValue('options'), 100);
        assert.equal(r.getRateValue('any-other'), r.totalRate);
    });
});

describe('DocumentsRate.setChildren / getChildren', () => {
    it('roundtrips children through setChildren/getChildren', () => {
        const a = fakeDoc();
        const b = fakeDoc();
        const r = new DocumentsRate(a, b);
        const kids = [{ totalRate: 10 }, { totalRate: 20 }];
        r.setChildren(kids);
        assert.equal(r.getChildren(), kids);
    });
});
