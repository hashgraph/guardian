import assert from 'node:assert/strict';
import {
    CsvObjectExamples,
    COMPARE_POLICIES_EXPORT_CSV_RESPONSE,
    COMPARE_MODULES_EXPORT_CSV_RESPONSE,
    COMPARE_SCHEMAS_EXPORT_CSV_RESPONSE,
    COMPARE_TOOLS_EXPORT_CSV_RESPONSE_SINGLE,
    COMPARE_TOOLS_EXPORT_CSV_RESPONSE_MULTI,
    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_SINGLE,
    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_MULTI,
} from '../../dist/middlewares/validation/csv-examples.js';

const namedExports = {
    COMPARE_POLICIES_EXPORT_CSV_RESPONSE,
    COMPARE_MODULES_EXPORT_CSV_RESPONSE,
    COMPARE_SCHEMAS_EXPORT_CSV_RESPONSE,
    COMPARE_TOOLS_EXPORT_CSV_RESPONSE_SINGLE,
    COMPARE_TOOLS_EXPORT_CSV_RESPONSE_MULTI,
    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_SINGLE,
    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_MULTI,
};

describe('csv-examples destructured named exports', () => {
    it('exposes exactly the seven documented keys on the map', () => {
        assert.deepEqual(Object.keys(CsvObjectExamples).sort(), Object.keys(namedExports).sort());
    });

    for (const [name, value] of Object.entries(namedExports)) {
        it(`${name} is a string`, () => {
            assert.equal(typeof value, 'string');
        });

        it(`${name} mirrors the same key on CsvObjectExamples`, () => {
            assert.equal(value, CsvObjectExamples[name]);
        });

        it(`${name} carries the data:text/csv charset prefix`, () => {
            assert.ok(value.startsWith('data:text/csv;charset=utf-8;'));
        });
    }
});

describe('csv-examples content invariants', () => {
    it('policies sample contains the policy header rows', () => {
        assert.ok(COMPARE_POLICIES_EXPORT_CSV_RESPONSE.includes('"Policy 1"'));
        assert.ok(COMPARE_POLICIES_EXPORT_CSV_RESPONSE.includes('"Policy 2"'));
        assert.ok(COMPARE_POLICIES_EXPORT_CSV_RESPONSE.includes('"Policy Blocks"'));
    });

    it('modules sample contains module sections', () => {
        assert.ok(COMPARE_MODULES_EXPORT_CSV_RESPONSE.includes('"Module 1"'));
        assert.ok(COMPARE_MODULES_EXPORT_CSV_RESPONSE.includes('"Module Blocks"'));
    });

    it('schemas sample contains schema fields section', () => {
        assert.ok(COMPARE_SCHEMAS_EXPORT_CSV_RESPONSE.includes('"Schema Fields"'));
    });

    it('multi tools sample is a superset prefix of the single tools sample sections', () => {
        assert.ok(COMPARE_TOOLS_EXPORT_CSV_RESPONSE_MULTI.includes('"Tool 3"'));
        assert.ok(!COMPARE_TOOLS_EXPORT_CSV_RESPONSE_SINGLE.includes('"Tool 3"'));
    });

    it('multi documents sample includes a third document block, single does not', () => {
        assert.ok(COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_MULTI.includes('"Document 3"'));
        assert.ok(!COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_SINGLE.includes('"Document 3"'));
    });

    it('every sample ends on a Total row', () => {
        for (const value of Object.values(namedExports)) {
            assert.ok(/"Total"/.test(value), 'expected a Total marker');
        }
    });
});
