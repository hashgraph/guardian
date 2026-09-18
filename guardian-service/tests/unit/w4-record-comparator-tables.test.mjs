import assert from 'node:assert/strict';
import { RecordComparator } from '../../dist/analytics/compare/comparators/record-comparator.js';
import { RecordModel } from '../../dist/analytics/compare/models/record.model.js';
import { VcDocumentModel } from '../../dist/analytics/compare/models/document.model.js';
import { CompareOptions } from '../../dist/analytics/compare/interfaces/compare-options.interface.js';

const opts = CompareOptions.default;

const vcRaw = (overrides = {}) => ({
    id: 'doc-1',
    schema: 'schema-A',
    messageId: 'm-1',
    topicId: '0.0.1',
    owner: 'did:owner',
    policyId: 'p-1',
    document: { credentialSubject: { type: 'Sub', amount: 5 } },
    option: { tag: 'submit' },
    relationships: [],
    ...overrides,
});

const vc = (overrides = {}) => {
    const m = new VcDocumentModel(vcRaw(overrides), opts);
    m.update(opts);
    return m;
};

const record = (children = []) => {
    const r = new RecordModel(opts);
    r.setChildren(children);
    return r;
};

const recordFromResults = (docs = []) => {
    const r = new RecordModel(opts);
    r.setDocuments(docs);
    return r;
};

describe('RecordComparator full compare', () => {
    it('compare of two records with documents yields one result with a populated table', () => {
        const left = record([vc({ id: 'l-1', messageId: 'l-1' })]);
        const right = record([vc({ id: 'r-1', messageId: 'r-1' })]);
        const [result] = new RecordComparator(opts).compare([left, right]);
        assert.ok(result.left);
        assert.ok(result.right);
        assert.equal(typeof result.total, 'number');
        assert.ok(Array.isArray(result.documents.report));
        assert.ok(result.documents.report.length >= 1);
        assert.ok(Array.isArray(result.documents.columns));
    });

    it('two structurally identical records compare as fully similar', () => {
        const left = record([vc({ id: 'a', messageId: 'a' })]);
        const right = record([vc({ id: 'a', messageId: 'a' })]);
        const [result] = new RecordComparator(opts).compare([left, right]);
        assert.equal(result.total, 100);
    });

    it('the report rows carry rate strings and level offsets', () => {
        const left = record([vc({ id: 'l', messageId: 'l' })]);
        const right = record([vc({ id: 'r', messageId: 'r' })]);
        const [result] = new RecordComparator(opts).compare([left, right]);
        const root = result.documents.report[0];
        assert.equal(root.lvl, 1);
        const child = result.documents.report.find((row) => row.lvl === 2);
        assert.ok(child);
        assert.equal(typeof child.total_rate, 'string');
        assert.ok(child.total_rate.endsWith('%') || child.total_rate === '-');
    });

    it('records with only one side populated render dash rate strings', () => {
        const left = record([vc({ id: 'only-left', messageId: 'only-left' })]);
        const right = record([]);
        const [result] = new RecordComparator(opts).compare([left, right]);
        const dashRow = result.documents.report.find((row) => row.total_rate === '-');
        assert.ok(dashRow);
    });

    it('compare across three records produces two pairwise results', () => {
        const mk = (id) => record([vc({ id, messageId: id })]);
        const results = new RecordComparator(opts).compare([mk('a'), mk('b'), mk('c')]);
        assert.equal(results.length, 2);
    });
});

describe('RecordComparator.tableToCsv', () => {
    it('emits a CSV with the Document 1 header and per-right sections', () => {
        const left = record([vc({ id: 'l', messageId: 'l' })]);
        const right = record([vc({ id: 'r', messageId: 'r' })]);
        const results = new RecordComparator(opts).compare([left, right]);
        const csv = RecordComparator.tableToCsv(results);
        assert.ok(csv.includes('Document 1'));
        assert.ok(csv.includes('Document 2'));
        assert.ok(csv.includes('Total'));
        assert.ok(csv.includes('Data'));
    });

    it('includes a section for each right-hand document', () => {
        const mk = (id) => record([vc({ id, messageId: id })]);
        const results = new RecordComparator(opts).compare([mk('a'), mk('b'), mk('c')]);
        const csv = RecordComparator.tableToCsv(results);
        assert.ok(csv.includes('Document 2'));
        assert.ok(csv.includes('Document 3'));
    });
});

describe('RecordComparator.mergeCompareResults', () => {
    it('merges pairwise results into a multi-result with size = rights + 1', () => {
        const mk = (id) => record([vc({ id, messageId: id })]);
        const rc = new RecordComparator(opts);
        const results = rc.compare([mk('a'), mk('b'), mk('c')]);
        const merged = rc.mergeCompareResults(results);
        assert.equal(merged.size, 3);
        assert.equal(merged.rights.length, 2);
        assert.equal(merged.totals.length, 2);
        assert.ok(merged.left);
    });

    it('the merged document table has columns scaled per right-hand side', () => {
        const mk = (id) => record([vc({ id, messageId: id })]);
        const rc = new RecordComparator(opts);
        const results = rc.compare([mk('a'), mk('b'), mk('c')]);
        const merged = rc.mergeCompareResults(results);
        const names = merged.documents.columns.map((c) => c.name);
        assert.ok(names.includes('left_id'));
        assert.ok(names.includes('right_id_1'));
        assert.ok(names.includes('right_id_2'));
        assert.ok(Array.isArray(merged.documents.report));
    });

    it('merging a single pairwise result yields size 2', () => {
        const rc = new RecordComparator(opts);
        const results = rc.compare([
            record([vc({ id: 'l', messageId: 'l' })]),
            record([vc({ id: 'r', messageId: 'r' })]),
        ]);
        const merged = rc.mergeCompareResults(results);
        assert.equal(merged.size, 2);
        assert.equal(merged.rights.length, 1);
    });
});

describe('RecordModel.setDocuments token accounting (drives info())', () => {
    it('counts vc/vp documents and sums vp token amounts', () => {
        const r = recordFromResults([
            { type: 'vc' },
            { type: 'vp', document: { verifiableCredential: [{}, { credentialSubject: { amount: 9 } }] } },
        ]);
        assert.equal(r.count, 2);
        assert.equal(r.tokens, 9);
        assert.deepEqual(r.info(), { documents: 2, tokens: 9 });
    });

    it('treats malformed vp documents as zero tokens', () => {
        const r = recordFromResults([
            { type: 'vp', document: null },
            { type: 'vp', document: { verifiableCredential: [] } },
        ]);
        assert.equal(r.count, 2);
        assert.equal(r.tokens, 0);
    });

    it('reads array-shaped credentialSubject amounts from the last verifiable credential', () => {
        const r = recordFromResults([
            {
                type: 'vp',
                document: { verifiableCredential: [{}, { credentialSubject: [{ amount: 3 }] }] },
            },
        ]);
        assert.equal(r.tokens, 3);
    });

    it('a single-credential vp resolves no mint token (mintIndex floors at 1)', () => {
        const r = recordFromResults([
            { type: 'vp', document: { verifiableCredential: [{ credentialSubject: { amount: 99 } }] } },
        ]);
        assert.equal(r.tokens, 0);
    });
});
