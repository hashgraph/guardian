import { assert } from 'chai';
import { DocumentComparator } from '../../dist/analytics/compare/comparators/document-comparator.js';
import { ModuleComparator } from '../../dist/analytics/compare/comparators/module-comparator.js';
import { PolicyComparator } from '../../dist/analytics/compare/comparators/policy-comparator.js';

const HEADER = 'data:text/csv;charset=utf-8;';
const emptyTable = () => ({ columns: [{ name: 'x', label: '', type: 'object' }], report: [] });

describe('DocumentComparator.tableToCsv', () => {
    const make = () => ([{
        left: { id: 'L', type: 'VC', owner: 'owner-l', policy: 'pol-l' },
        right: { id: 'R', type: 'VP', owner: 'owner-r', policy: 'pol-r' },
        total: 88,
        documents: emptyTable(),
    }]);

    it('starts with the csv data-uri header', () => {
        const csv = DocumentComparator.tableToCsv(make());
        assert.isTrue(csv.startsWith(HEADER));
    });

    it('emits the Document 1 left header block', () => {
        const csv = DocumentComparator.tableToCsv(make());
        assert.include(csv, '"Document 1"');
        assert.include(csv, '"Document ID","Document Type","Document Owner","Policy"');
    });

    it('writes the left document values', () => {
        const csv = DocumentComparator.tableToCsv(make());
        assert.include(csv, '"L","VC","owner-l","pol-l"');
    });

    it('writes the right document under a Document 2 heading', () => {
        const csv = DocumentComparator.tableToCsv(make());
        assert.include(csv, '"Document 2"');
        assert.include(csv, '"R","VP","owner-r","pol-r"');
    });

    it('appends the total as a percentage', () => {
        const csv = DocumentComparator.tableToCsv(make());
        assert.include(csv, '"Total","88%"');
    });

    it('numbers additional documents sequentially', () => {
        const results = [
            { left: { id: 'L' }, right: { id: 'R1' }, total: 10, documents: emptyTable() },
            { left: { id: 'L' }, right: { id: 'R2' }, total: 20, documents: emptyTable() },
        ];
        const csv = DocumentComparator.tableToCsv(results);
        assert.include(csv, '"Document 2"');
        assert.include(csv, '"Document 3"');
    });

    it('is a static method (callable without an instance)', () => {
        assert.isFunction(DocumentComparator.tableToCsv);
    });
});

describe('DocumentComparator.mergeCompareResults', () => {
    const comparator = new DocumentComparator();
    const results = [
        { left: { id: 'L' }, right: { id: 'R1' }, total: 30, documents: emptyTable() },
        { left: { id: 'L' }, right: { id: 'R2' }, total: 70, documents: emptyTable() },
    ];

    it('sets size to results length + 1', () => {
        assert.equal(comparator.mergeCompareResults(results).size, 3);
    });

    it('carries the left info from the first result', () => {
        assert.deepEqual(comparator.mergeCompareResults(results).left, { id: 'L' });
    });

    it('collects all rights', () => {
        const merged = comparator.mergeCompareResults(results);
        assert.deepEqual(merged.rights, [{ id: 'R1' }, { id: 'R2' }]);
    });

    it('collects all totals', () => {
        assert.deepEqual(comparator.mergeCompareResults(results).totals, [30, 70]);
    });

    it('produces a documents table object with columns and report', () => {
        const merged = comparator.mergeCompareResults(results);
        assert.property(merged.documents, 'columns');
        assert.property(merged.documents, 'report');
    });
});

describe('ModuleComparator.csv', () => {
    const comparator = new ModuleComparator();
    const result = {
        left: { id: 'm1', name: 'Mod1', description: 'first' },
        right: { id: 'm2', name: 'Mod2', description: 'second' },
        total: 64,
        inputEvents: emptyTable(),
        outputEvents: emptyTable(),
        variables: emptyTable(),
        blocks: emptyTable(),
    };

    it('starts with the csv data-uri header', () => {
        assert.isTrue(comparator.csv(result).startsWith(HEADER));
    });

    it('emits a Module 1 section with the left id/name/description', () => {
        const csv = comparator.csv(result);
        assert.include(csv, '"Module 1"');
        assert.include(csv, '"m1","Mod1","first"');
    });

    it('emits a Module 2 section with the right id/name/description', () => {
        const csv = comparator.csv(result);
        assert.include(csv, '"Module 2"');
        assert.include(csv, '"m2","Mod2","second"');
    });

    it('labels the four sub-tables', () => {
        const csv = comparator.csv(result);
        assert.include(csv, '"Module Input Events"');
        assert.include(csv, '"Module Output Events"');
        assert.include(csv, '"Module Variables"');
        assert.include(csv, '"Module Blocks"');
    });

    it('appends the total percentage', () => {
        assert.include(comparator.csv(result), '"Total","64%"');
    });
});

describe('PolicyComparator.tableToCsv', () => {
    const comparator = new PolicyComparator();
    const make = () => ([{
        left: { id: 'p1', name: 'Pol1', description: 'd1', instanceTopicId: 't1', version: '1.0' },
        right: { id: 'p2', name: 'Pol2', description: 'd2', instanceTopicId: 't2', version: '2.0' },
        total: 51,
        roles: emptyTable(),
        groups: emptyTable(),
        topics: emptyTable(),
        tokens: emptyTable(),
        tools: emptyTable(),
        blocks: emptyTable(),
    }]);

    it('starts with the csv data-uri header', () => {
        assert.isTrue(comparator.tableToCsv(make()).startsWith(HEADER));
    });

    it('emits the Policy 1 left header and values', () => {
        const csv = comparator.tableToCsv(make());
        assert.include(csv, '"Policy 1"');
        assert.include(csv, '"Policy ID","Policy Name","Policy Description","Policy Topic","Policy Version"');
        assert.include(csv, '"p1","Pol1","d1","t1","1.0"');
    });

    it('emits the Policy 2 right values', () => {
        const csv = comparator.tableToCsv(make());
        assert.include(csv, '"Policy 2"');
        assert.include(csv, '"p2","Pol2","d2","t2","2.0"');
    });

    it('labels all six policy sub-tables', () => {
        const csv = comparator.tableToCsv(make());
        for (const label of ['Policy Roles', 'Policy Groups', 'Policy Topics', 'Policy Tokens', 'Policy Tools', 'Policy Blocks']) {
            assert.include(csv, `"${label}"`);
        }
    });

    it('appends the total percentage', () => {
        assert.include(comparator.tableToCsv(make()), '"Total","51%"');
    });
});

describe('PolicyComparator.to dispatch', () => {
    const comparator = new PolicyComparator();
    const single = () => ([{
        left: { id: 'p1', name: 'n', description: 'd', instanceTopicId: 't', version: 'v' },
        right: { id: 'p2', name: 'n', description: 'd', instanceTopicId: 't', version: 'v' },
        total: 0,
        roles: emptyTable(), groups: emptyTable(), topics: emptyTable(),
        tokens: emptyTable(), tools: emptyTable(), blocks: emptyTable(),
    }]);

    it('returns a csv string when type is "csv" for a single result', () => {
        const out = comparator.to(single(), 'csv');
        assert.isString(out);
        assert.isTrue(out.startsWith(HEADER));
    });

    it('returns the single result object as-is for a non-csv type', () => {
        const results = single();
        const out = comparator.to(results, 'json');
        assert.strictEqual(out, results[0]);
    });

    it('throws "Invalid size" when given an empty results array', () => {
        assert.throws(() => comparator.to([], 'json'), /Invalid size/);
    });

    const multi = () => ([
        {
            left: { id: 'p1' }, right: { id: 'r1' }, total: 10,
            roles: emptyTable(), groups: emptyTable(), topics: emptyTable(),
            tokens: emptyTable(), tools: emptyTable(), blocks: emptyTable(),
        },
        {
            left: { id: 'p1' }, right: { id: 'r2' }, total: 20,
            roles: emptyTable(), groups: emptyTable(), topics: emptyTable(),
            tokens: emptyTable(), tools: emptyTable(), blocks: emptyTable(),
        },
    ]);

    it('returns a merged multi-result object for >1 results when type is not csv', () => {
        const out = comparator.to(multi(), 'json');
        assert.equal(out.size, 3);
        assert.deepEqual(out.totals, [10, 20]);
        assert.equal(out.rights.length, 2);
        assert.property(out, 'blocks');
    });

    it('returns a csv string for >1 results when type is csv', () => {
        const out = comparator.to(multi(), 'csv');
        assert.isString(out);
        assert.include(out, '"Policy 2"');
        assert.include(out, '"Policy 3"');
    });
});
