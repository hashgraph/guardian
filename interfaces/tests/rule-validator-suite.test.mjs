import assert from 'node:assert/strict';
import { RuleValidator } from '../dist/validators/rule-validator/rule-validator.js';
import { FieldValidator } from '../dist/validators/rule-validator/field-validator.js';
import { DocumentFieldVariable } from '../dist/validators/rule-validator/document-field-validator.js';
import { DocumentFieldValidators } from '../dist/validators/rule-validator/document-field-validators.js';
import { DocumentValidator } from '../dist/validators/rule-validator/document-validator.js';
import { DocumentValidators } from '../dist/validators/rule-validator/document-validators.js';
import { FieldRuleResult } from '../dist/validators/rule-validator/interfaces/status.js';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

function stubEngine(handler) {
    const calls = [];
    const engine = {
        calls,
        evaluate(expr, scope) {
            calls.push({ expr, scope });
            return handler ? handler(expr, scope) : expr;
        }
    };
    return engine;
}

describe('RuleValidator', () => {
    it('a null rule produces no formula type and validates to None', () => {
        FormulaEngine.setMathEngine(stubEngine(() => 1));
        const v = new RuleValidator('id1', null);
        assert.equal(v.validate({}), FieldRuleResult.None);
    });

    it('an unknown rule type validates to None', () => {
        FormulaEngine.setMathEngine(stubEngine(() => 1));
        const v = new RuleValidator('id1', { type: 'mystery' });
        assert.equal(v.validate({}), FieldRuleResult.None);
    });

    it('exposes id and rule as readonly fields', () => {
        const rule = { type: 'formula', formula: 'a' };
        const v = new RuleValidator('the-id', rule);
        assert.equal(v.id, 'the-id');
        assert.equal(v.rule, rule);
    });

    describe('formula type → result mapping', () => {
        const cases = [
            ['truthy number', 5, FieldRuleResult.Success],
            ['truthy string', 'ok', FieldRuleResult.Success],
            ['truthy object', { a: 1 }, FieldRuleResult.Success],
            ['number 0', 0, FieldRuleResult.Failure],
            ['boolean false', false, FieldRuleResult.Failure],
            ['string "0"', '0', FieldRuleResult.Failure],
            ['string "false"', 'false', FieldRuleResult.Failure],
            ['empty string', '', FieldRuleResult.Error],
            ['"Incorrect formula"', 'Incorrect formula', FieldRuleResult.Error],
            ['null result', null, FieldRuleResult.Error],
            ['undefined result', undefined, FieldRuleResult.Error],
        ];
        for (const [label, ret, expected] of cases) {
            it(`maps ${label} → ${expected}`, () => {
                FormulaEngine.setMathEngine(stubEngine(() => ret));
                const v = new RuleValidator('x', { type: 'formula', formula: 'expr' });
                assert.equal(v.validate({ a: 1 }), expected);
            });
        }

        it('maps an engine exception → Error', () => {
            FormulaEngine.setMathEngine(stubEngine(() => { throw new Error('boom'); }));
            const v = new RuleValidator('x', { type: 'formula', formula: 'expr' });
            assert.equal(v.validate({}), FieldRuleResult.Error);
        });

        it('an empty formula short-circuits to None without calling the engine', () => {
            const eng = stubEngine(() => 1);
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('x', { type: 'formula', formula: '' });
            assert.equal(v.validate({}), FieldRuleResult.None);
            assert.equal(eng.calls.length, 0);
        });

        it('forwards the configured formula and scope to the engine', () => {
            const eng = stubEngine(() => 1);
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('x', { type: 'formula', formula: 'a + b' });
            v.validate({ a: 2, b: 3 });
            assert.equal(eng.calls[0].expr, 'a + b');
            assert.deepEqual(eng.calls[0].scope, { a: 2, b: 3 });
        });
    });

    describe('range type', () => {
        it('builds a "min <= id <= max" expression using the validator id', () => {
            const eng = stubEngine(() => 1);
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('temperature', { type: 'range', min: 1, max: 10 });
            v.validate({ temperature: 5 });
            assert.equal(eng.calls[0].expr, '1 <= temperature <= 10');
        });

        it('maps a truthy range evaluation to Success', () => {
            FormulaEngine.setMathEngine(stubEngine(() => true));
            const v = new RuleValidator('t', { type: 'range', min: 0, max: 100 });
            assert.equal(v.validate({ t: 50 }), FieldRuleResult.Success);
        });

        it('maps a false range evaluation to Failure', () => {
            FormulaEngine.setMathEngine(stubEngine(() => false));
            const v = new RuleValidator('t', { type: 'range', min: 0, max: 100 });
            assert.equal(v.validate({ t: 500 }), FieldRuleResult.Failure);
        });
    });

    describe('condition type', () => {
        it('an empty conditions list validates to None', () => {
            FormulaEngine.setMathEngine(stubEngine(() => 1));
            const v = new RuleValidator('x', { type: 'condition', conditions: [] });
            assert.equal(v.validate({}), FieldRuleResult.None);
        });

        it('runs the "then" branch when the "if" condition succeeds', () => {
            const eng = stubEngine((expr) => (expr === 'IF' ? 1 : 1));
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('x', {
                type: 'condition',
                conditions: [{
                    type: 'if',
                    condition: { type: 'formula', formula: 'IF' },
                    formula: { type: 'formula', formula: 'THEN' }
                }]
            });
            assert.equal(v.validate({}), FieldRuleResult.Success);
            assert.deepEqual(eng.calls.map((c) => c.expr), ['IF', 'THEN']);
        });

        it('returns Error immediately when the "if" condition errors', () => {
            const eng = stubEngine((expr) => (expr === 'IF' ? '' : 1));
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('x', {
                type: 'condition',
                conditions: [{
                    type: 'if',
                    condition: { type: 'formula', formula: 'IF' },
                    formula: { type: 'formula', formula: 'THEN' }
                }]
            });
            assert.equal(v.validate({}), FieldRuleResult.Error);
            assert.equal(eng.calls.length, 1);
        });

        it('falls through a failed "if" to the next matching branch', () => {
            const eng = stubEngine((expr) => {
                if (expr === 'IF1') return false;
                if (expr === 'IF2') return 1;
                if (expr === 'THEN2') return 7;
                return 1;
            });
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('x', {
                type: 'condition',
                conditions: [
                    { type: 'if', condition: { type: 'formula', formula: 'IF1' }, formula: { type: 'formula', formula: 'THEN1' } },
                    { type: 'if', condition: { type: 'formula', formula: 'IF2' }, formula: { type: 'formula', formula: 'THEN2' } }
                ]
            });
            assert.equal(v.validate({}), FieldRuleResult.Success);
        });

        it('an "else" branch is treated as an unconditional success path', () => {
            const eng = stubEngine((expr) => {
                if (expr === 'IF1') return false;
                if (expr === 'ELSE') return 1;
                return 1;
            });
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('x', {
                type: 'condition',
                conditions: [
                    { type: 'if', condition: { type: 'formula', formula: 'IF1' }, formula: { type: 'formula', formula: 'THEN1' } },
                    { type: 'else', formula: { type: 'formula', formula: 'ELSE' } }
                ]
            });
            assert.equal(v.validate({}), FieldRuleResult.Success);
        });

        it('builds a text condition as "variable == \'value\'"', () => {
            const eng = stubEngine(() => 1);
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('x', {
                type: 'condition',
                conditions: [{
                    type: 'if',
                    condition: { type: 'text', variable: 'status', value: 'OPEN' },
                    formula: { type: 'formula', formula: 'T' }
                }]
            });
            v.validate({});
            assert.equal(eng.calls[0].expr, "status == 'OPEN'");
        });

        it('builds a range condition as "min <= variable <= max"', () => {
            const eng = stubEngine(() => 1);
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('x', {
                type: 'condition',
                conditions: [{
                    type: 'if',
                    condition: { type: 'range', variable: 'n', min: 2, max: 8 },
                    formula: { type: 'formula', formula: 'T' }
                }]
            });
            v.validate({});
            assert.equal(eng.calls[0].expr, '2 <= n <= 8');
        });

        it('builds an enum condition as OR-joined equality checks', () => {
            const eng = stubEngine(() => 1);
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('x', {
                type: 'condition',
                conditions: [{
                    type: 'if',
                    condition: { type: 'enum', variable: 'c', value: ['A', 'B', 'C'] },
                    formula: { type: 'formula', formula: 'T' }
                }]
            });
            v.validate({});
            assert.equal(eng.calls[0].expr, "c == 'A' or c == 'B' or c == 'C'");
        });

        it('an enum condition with a non-array value yields an empty expression', () => {
            const eng = stubEngine(() => 1);
            FormulaEngine.setMathEngine(eng);
            const v = new RuleValidator('x', {
                type: 'condition',
                conditions: [{
                    type: 'if',
                    condition: { type: 'enum', variable: 'c', value: 'A' },
                    formula: { type: 'formula', formula: 'T' }
                }]
            });
            assert.equal(v.validate({}), FieldRuleResult.None);
        });
    });
});

describe('FieldValidator', () => {
    it('captures path and schemaId from the rule data', () => {
        const fv = new FieldValidator({ id: 'r1', rule: null, path: 'a.b', schemaId: 'schema#1' });
        assert.equal(fv.path, 'a.b');
        assert.equal(fv.schemaId, 'schema#1');
    });

    it('checkField matches by path only when no schema is provided', () => {
        const fv = new FieldValidator({ id: 'r1', rule: null, path: 'a.b', schemaId: 's1' });
        assert.equal(fv.checkField('a.b'), true);
        assert.equal(fv.checkField('a.c'), false);
    });

    it('checkField requires both path and schema when schema is provided', () => {
        const fv = new FieldValidator({ id: 'r1', rule: null, path: 'a.b', schemaId: 's1' });
        assert.equal(fv.checkField('a.b', 's1'), true);
        assert.equal(fv.checkField('a.b', 's2'), false);
        assert.equal(fv.checkField('a.c', 's1'), false);
    });

    it('inherits RuleValidator validation behaviour', () => {
        FormulaEngine.setMathEngine(stubEngine(() => 1));
        const fv = new FieldValidator({ id: 'r1', rule: { type: 'formula', formula: 'a' }, path: 'p', schemaId: 's' });
        assert.equal(fv.validate({ a: 1 }), FieldRuleResult.Success);
    });
});

describe('DocumentFieldVariable', () => {
    it('maps all fields and composes fullPah from schemaId and path', () => {
        const v = new DocumentFieldVariable({
            id: 'v1', schemaId: 'schema#1', path: 'a.b',
            fieldRef: true, fieldArray: false,
            fieldDescription: 'desc', schemaName: 'My Schema'
        });
        assert.equal(v.id, 'v1');
        assert.equal(v.schemaId, 'schema#1');
        assert.equal(v.path, 'a.b');
        assert.equal(v.fullPah, 'schema#1/a.b');
        assert.equal(v.fieldRef, true);
        assert.equal(v.fieldArray, false);
        assert.equal(v.fieldDescription, 'desc');
        assert.equal(v.schemaName, 'My Schema');
    });
});

describe('DocumentFieldValidators', () => {
    const rules = [
        { id: 'a', rule: { type: 'formula', formula: 'A' }, path: 'pa', schemaId: 's1' },
        { id: 'b', rule: { type: 'formula', formula: 'B' }, path: 'pb', schemaId: 's1' },
    ];

    it('an empty/omitted rule list yields empty collections', () => {
        const d = new DocumentFieldValidators();
        assert.deepEqual(d.rules, []);
        assert.deepEqual(d.variables, []);
        assert.equal(d.idToPath.size, 0);
    });

    it('builds a FieldValidator and DocumentFieldVariable per rule', () => {
        const d = new DocumentFieldValidators(rules);
        assert.equal(d.rules.length, 2);
        assert.equal(d.variables.length, 2);
        assert.ok(d.rules[0] instanceof FieldValidator);
    });

    it('builds bidirectional id↔fullPath maps', () => {
        const d = new DocumentFieldValidators(rules);
        assert.equal(d.idToPath.get('a'), 's1/pa');
        assert.equal(d.pathToId.get('s1/pa'), 'a');
        assert.equal(d.idToPath.get('b'), 's1/pb');
    });

    it('validate keys results by rule id', () => {
        FormulaEngine.setMathEngine(stubEngine((expr) => (expr === 'A' ? 1 : 0)));
        const d = new DocumentFieldValidators(rules);
        const result = d.validate({});
        assert.equal(result.a, FieldRuleResult.Success);
        assert.equal(result.b, FieldRuleResult.Failure);
    });

    it('validateWithFullPath keys results by full path', () => {
        FormulaEngine.setMathEngine(stubEngine(() => 1));
        const d = new DocumentFieldValidators(rules);
        const result = d.validateWithFullPath({});
        assert.equal(result['s1/pa'], FieldRuleResult.Success);
        assert.equal(result['s1/pb'], FieldRuleResult.Success);
    });
});

describe('DocumentValidator static helpers', () => {
    it('getCredentialSubject returns the first element of an array subject', () => {
        assert.deepEqual(
            DocumentValidator.getCredentialSubject({ credentialSubject: [{ a: 1 }, { a: 2 }] }),
            { a: 1 }
        );
    });

    it('getCredentialSubject returns a non-array subject as-is', () => {
        assert.deepEqual(DocumentValidator.getCredentialSubject({ credentialSubject: { a: 1 } }), { a: 1 });
    });

    it('getCredentialSubject of undefined document is undefined', () => {
        assert.equal(DocumentValidator.getCredentialSubject(undefined), undefined);
    });

    it('convertDocument flattens primitives into dotted paths', () => {
        const map = DocumentValidator.convertDocument({ a: 1, b: 'x' }, 's/', new Map());
        assert.equal(map.get('s/a'), 1);
        assert.equal(map.get('s/b'), 'x');
    });

    it('convertDocument recurses into nested objects', () => {
        const map = DocumentValidator.convertDocument({ a: { b: { c: 5 } } }, 's/', new Map());
        assert.equal(map.get('s/a.b.c'), 5);
        assert.deepEqual(map.get('s/a'), { b: { c: 5 } });
    });

    it('convertDocument stores arrays but does not recurse into them', () => {
        const map = DocumentValidator.convertDocument({ a: [1, 2, 3] }, 's/', new Map());
        assert.deepEqual(map.get('s/a'), [1, 2, 3]);
        assert.equal(map.get('s/a.0'), undefined);
    });

    it('convertDocument skips function-valued properties', () => {
        const map = DocumentValidator.convertDocument({ a: 1, fn: () => 0 }, 's/', new Map());
        assert.equal(map.has('s/fn'), false);
        assert.equal(map.get('s/a'), 1);
    });

    it('convertDocument of a falsy document returns the list unchanged', () => {
        const list = new Map([['x', 1]]);
        assert.equal(DocumentValidator.convertDocument(null, 's/', list), list);
        assert.equal(list.size, 1);
    });
});

describe('DocumentValidator instance', () => {
    function makeValidator() {
        return new DocumentValidator({
            rules: {
                name: 'Rule A',
                description: 'a rule',
                config: {
                    fields: [
                        { id: 'f1', rule: { type: 'formula', formula: 'F1' }, path: 'amount', schemaId: 'schema#1' }
                    ]
                }
            },
            relationships: []
        });
    }

    it('collects schema ids from its variables', () => {
        const v = makeValidator();
        assert.ok(v.schemas.has('schema#1'));
        assert.equal(v.name, 'Rule A');
        assert.equal(v.description, 'a rule');
    });

    it('validate returns null for an iri not among its schemas', () => {
        const v = makeValidator();
        assert.equal(v.validate('other#1', new Map()), null);
    });

    it('validate returns null for an undefined iri', () => {
        const v = makeValidator();
        assert.equal(v.validate(undefined, new Map()), null);
    });

    it('validate scores variables from the supplied value map', () => {
        FormulaEngine.setMathEngine(stubEngine(() => 1));
        const v = makeValidator();
        const list = new Map([['schema#1/amount', 42]]);
        const result = v.validate('schema#1', list);
        assert.equal(result['schema#1/amount'], FieldRuleResult.Success);
    });

    it('relationships from constructor data are flattened into the lookup map', () => {
        const v = new DocumentValidator({
            rules: { config: { fields: [{ id: 'f1', rule: null, path: 'amount', schemaId: 'schema#1' }] } },
            relationships: [{ schema: 'schema#2', document: { credentialSubject: { ref: 9 } } }]
        });
        assert.equal(v.relationships.get('schema#2/ref'), 9);
    });
});

describe('DocumentValidators', () => {
    function build() {
        return new DocumentValidators([{
            rules: {
                name: 'R', description: 'd',
                config: { fields: [{ id: 'f1', rule: { type: 'formula', formula: 'F' }, path: 'amount', schemaId: 'schema#1' }] }
            },
            relationships: []
        }]);
    }

    it('aggregates schemas across all child validators', () => {
        const dv = build();
        assert.ok(dv.schemas.has('schema#1'));
        assert.equal(dv.validators.length, 1);
    });

    it('a null config yields zero validators and null validation', () => {
        const dv = new DocumentValidators(null);
        assert.equal(dv.validators.length, 0);
        assert.equal(dv.validateVC('schema#1', {}), null);
    });

    it('validateVC returns null for an iri not in the schema set', () => {
        const dv = build();
        assert.equal(dv.validateVC('unknown#1', { credentialSubject: {} }), null);
    });

    it('validateVC flattens the credential subject and produces a status map', () => {
        FormulaEngine.setMathEngine(stubEngine(() => 1));
        const dv = build();
        const statuses = dv.validateVC('schema#1', { credentialSubject: { amount: 10 } });
        assert.equal(statuses['schema#1/amount'].status, FieldRuleResult.Success);
        assert.equal(statuses['schema#1/amount'].rules[0].name, 'R');
    });

    it('validateForm flattens raw form data and produces a status map', () => {
        FormulaEngine.setMathEngine(stubEngine(() => 0));
        const dv = build();
        const statuses = dv.validateForm('schema#1', { amount: 10 });
        assert.equal(statuses['schema#1/amount'].status, FieldRuleResult.Failure);
    });

    it('omits fields whose status is None from the status map', () => {
        FormulaEngine.setMathEngine(stubEngine(() => 1));
        const dv = new DocumentValidators([{
            rules: { name: 'R', description: 'd', config: { fields: [{ id: 'f1', rule: null, path: 'amount', schemaId: 'schema#1' }] } },
            relationships: []
        }]);
        const statuses = dv.validateForm('schema#1', { amount: 1 });
        assert.deepEqual(statuses, {});
    });
});
