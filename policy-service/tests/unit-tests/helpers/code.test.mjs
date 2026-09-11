import { assert } from 'chai';
import { Code } from '../../../dist/policy-engine/helpers/math-model/code.js';
import { buildTableHelper } from '../../../dist/policy-engine/helpers/table-field-core.js';

describe('Code (math-model script)', () => {
    it('constructs with empty text by default', () => {
        const code = new Code();
        assert.equal(code.text, '');
    });

    it('constructor accepts initial code text', () => {
        const code = new Code('return 42');
        assert.equal(code.text, 'return 42');
    });

    it('toJson returns { code }', () => {
        const code = new Code('return 1');
        assert.deepEqual(code.toJson(), { code: 'return 1' });
    });

    it('validate returns null for syntactically valid code', () => {
        const code = new Code('return 1 + 2');
        assert.equal(code.validate(), null);
    });

    it('validate returns the error string for invalid code', () => {
        const code = new Code('this is not valid;;;;{{');
        const err = code.validate();
        assert.ok(err);
        assert.match(err, /Error|SyntaxError/);
    });

    describe('static from()', () => {
        it('returns null for falsy / non-object input', () => {
            assert.equal(Code.from(null), null);
            assert.equal(Code.from(undefined), null);
            assert.equal(Code.from('plain string'), null);
        });

        it('returns null when json.code is absent', () => {
            assert.equal(Code.from({}), null);
        });

        it('returns a Code instance when json.code is set', () => {
            const code = Code.from({ code: 'return 9' });
            assert.ok(code);
            assert.equal(code.text, 'return 9');
        });
    });

    describe('instance from()', () => {
        it("rebinds text from json.code on the same instance", () => {
            const code = new Code('original');
            code.from({ code: 'updated' });
            assert.equal(code.text, 'updated');
        });

        it('returns the instance untouched when json is null/non-object', () => {
            const code = new Code('keep');
            code.from(null);
            assert.equal(code.text, 'keep');
            code.from('string-arg');
            assert.equal(code.text, 'keep');
        });

        it('falls back to "" when json.code is missing', () => {
            const code = new Code('initial');
            code.from({});
            assert.equal(code.text, '');
        });
    });

    describe('setContext / run', () => {
        it('setContext stores the supplied context object', () => {
            const code = new Code('return 1');
            code.setContext({ document: { foo: 1 }, result: 99 });
            assert.equal(code.context.result, 99);
        });

        it('setContext defaults to {} when called with falsy', () => {
            const code = new Code('return 1');
            code.setContext(null);
            assert.deepEqual(code.context, {});
        });

        it('run() returns the script result when truthy', () => {
            const code = new Code('return 7;');
            code.setContext({ result: 1 });
            assert.equal(code.run(), 7);
        });

        it('run() falls back to context.result when the script returns falsy', () => {
            const code = new Code('return 0;');
            code.setContext({ result: 'fallback' });
            assert.equal(code.run(), 'fallback');
        });

        it('exposes the table helper without changing the stored document value', () => {
            const tableValue = JSON.stringify({
                type: 'table',
                fileId: 'f1',
                columnNames: ['CO2 (tonnes)'],
                columnKeys: ['co2_tonnes']
            });
            const code = new Code("return table.col(getField('field4'), 'co2_tonnes').map(table.num);");
            code.setContext({
                document: { field4: tableValue },
                getField: (path) => path === 'field4' ? tableValue : undefined,
                table: buildTableHelper({
                    f1: { columnKeys: ['co2_tonnes'], rows: [{ co2_tonnes: '42' }] }
                })
            });
            assert.deepEqual(code.run(), [42]);
            assert.equal(code.context.document.field4, tableValue);
        });

        it('leaves table undefined when the context carries no helper', () => {
            const code = new Code('return typeof table;');
            code.setContext({ result: 'fallback' });
            assert.equal(code.run(), 'undefined');
        });
    });
});
