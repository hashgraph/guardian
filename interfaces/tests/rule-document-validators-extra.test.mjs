import assert from 'node:assert/strict';
import { RuleValidator } from '../dist/validators/rule-validator/rule-validator.js';
import { DocumentValidator } from '../dist/validators/rule-validator/document-validator.js';
import { DocumentValidators } from '../dist/validators/rule-validator/document-validators.js';
import { FieldRuleResult } from '../dist/validators/rule-validator/interfaces/status.js';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

const engine = (fn) => FormulaEngine.setMathEngine({ evaluate: fn });

after(() => {
    FormulaEngine.setMathEngine({ evaluate: (e) => e });
});

describe('RuleValidator.parseCondition branches', () => {
    const v = new RuleValidator('id', null);

    it('returns an empty string for a falsy condition', () => {
        assert.equal(v.parseCondition(null), '');
        assert.equal(v.parseCondition(undefined), '');
    });

    it('returns the raw formula for a formula condition', () => {
        assert.equal(v.parseCondition({ type: 'formula', formula: 'a + b' }), 'a + b');
    });

    it('builds a range expression', () => {
        assert.equal(v.parseCondition({ type: 'range', min: 1, variable: 'x', max: 9 }), '1 <= x <= 9');
    });

    it('builds a text equality expression', () => {
        assert.equal(v.parseCondition({ type: 'text', variable: 'x', value: 'a' }), "x == 'a'");
    });

    it('joins enum values with or', () => {
        assert.equal(
            v.parseCondition({ type: 'enum', variable: 'x', value: ['a', 'b'] }),
            "x == 'a' or x == 'b'",
        );
    });

    it('returns an empty string for an unknown condition type', () => {
        assert.equal(v.parseCondition({ type: 'mystery' }), '');
    });
});

describe('RuleValidator.calculate exception handling', () => {
    it('maps an evaluation throw to Error', () => {
        FormulaEngine.setMathEngine(null);
        const v = new RuleValidator('id', { type: 'formula', formula: 'x' });
        assert.equal(v.validate({}), FieldRuleResult.Error);
        engine((e) => e);
    });
});

describe('DocumentValidator.validate value resolution', () => {
    function makeValidator(relationships) {
        return new DocumentValidator({
            rules: {
                name: 'R',
                description: 'd',
                config: {
                    fields: [{ id: 'f1', rule: { type: 'formula', formula: 'F1' }, path: 'amount', schemaId: 'schema#1' }],
                },
            },
            relationships: relationships || [],
        });
    }

    it('falls back to relationship documents when the list misses a path', () => {
        let seen;
        engine((expr, scope) => { seen = scope; return 1; });
        const v = makeValidator([{ schema: 'schema#1', document: { credentialSubject: { amount: 9 } } }]);
        const result = v.validate('schema#1', new Map());
        assert.equal(seen.f1, 9);
        assert.equal(result['schema#1/amount'], FieldRuleResult.Success);
    });

    it('scores null when neither the list nor relationships hold the path', () => {
        let seen;
        engine((expr, scope) => { seen = scope; return 1; });
        const v = makeValidator([]);
        v.validate('schema#1', new Map());
        assert.equal(seen.f1, null);
    });

    it('prefers the supplied list over relationships', () => {
        let seen;
        engine((expr, scope) => { seen = scope; return 1; });
        const v = makeValidator([{ schema: 'schema#1', document: { credentialSubject: { amount: 9 } } }]);
        v.validate('schema#1', new Map([['schema#1/amount', 4]]));
        assert.equal(seen.f1, 4);
    });
});

describe('DocumentValidators.validateForm / validateVC guards', () => {
    const data = (formula) => [{
        rules: {
            name: 'R',
            description: 'd',
            config: { fields: [{ id: 'f1', rule: { type: 'formula', formula }, path: 'amount', schemaId: 'schema#1' }] },
        },
        relationships: [],
    }];

    it('validateForm returns null when no validators are configured', () => {
        const d = new DocumentValidators([]);
        assert.equal(d.validateForm('schema#1', { amount: 1 }), null);
    });

    it('validateForm returns null for an unknown or missing iri', () => {
        const d = new DocumentValidators(data('F'));
        assert.equal(d.validateForm('other#1', { amount: 1 }), null);
        assert.equal(d.validateForm(undefined, { amount: 1 }), null);
    });

    it('validateForm produces a status per validated path', () => {
        engine(() => 1);
        const d = new DocumentValidators(data('F'));
        const result = d.validateForm('schema#1', { amount: 1 });
        assert.equal(result['schema#1/amount'].status, FieldRuleResult.Success);
        assert.equal(result['schema#1/amount'].rules.length, 1);
        assert.equal(result['schema#1/amount'].rules[0].name, 'R');
    });

    it('validateVC unwraps the credential subject before validating', () => {
        engine(() => 1);
        const d = new DocumentValidators(data('F'));
        const result = d.validateVC('schema#1', { credentialSubject: [{ amount: 1 }] });
        assert.equal(result['schema#1/amount'].status, FieldRuleResult.Success);
    });

    it('validateVC returns null when no validators are configured', () => {
        const d = new DocumentValidators([]);
        assert.equal(d.validateVC('schema#1', { credentialSubject: { amount: 1 } }), null);
    });
});

describe('DocumentValidators.validate merging', () => {
    const twoValidators = (f1, f2) => new DocumentValidators([
        {
            rules: { name: 'A', description: 'a', config: { fields: [{ id: 'x', rule: { type: 'formula', formula: f1 }, path: 'amount', schemaId: 'schema#1' }] } },
            relationships: [],
        },
        {
            rules: { name: 'B', description: 'b', config: { fields: [{ id: 'y', rule: { type: 'formula', formula: f2 }, path: 'amount', schemaId: 'schema#1' }] } },
            relationships: [],
        },
    ]);

    it('appends each validator rule for a shared path', () => {
        engine(() => 1);
        const d = twoValidators('F1', 'F2');
        const result = d.validateForm('schema#1', { amount: 1 });
        const entry = result['schema#1/amount'];
        assert.equal(entry.rules.length, 2);
        assert.deepEqual(entry.rules.map((r) => r.name), ['A', 'B']);
    });

    it('a later Failure overrides an earlier Success status', () => {
        engine((expr) => (expr === 'F1' ? 1 : 0));
        const d = twoValidators('F1', 'F2');
        const entry = d.validateForm('schema#1', { amount: 1 })['schema#1/amount'];
        assert.equal(entry.status, FieldRuleResult.Failure);
        assert.equal(entry.rules[0].status, FieldRuleResult.Success);
        assert.equal(entry.rules[1].status, FieldRuleResult.Failure);
    });

    it('a later Success keeps the earlier status', () => {
        engine((expr) => (expr === 'F1' ? 0 : 1));
        const d = twoValidators('F1', 'F2');
        const entry = d.validateForm('schema#1', { amount: 1 })['schema#1/amount'];
        assert.equal(entry.status, FieldRuleResult.Failure);
    });

    it('a later Error overrides an earlier Success status', () => {
        engine((expr) => (expr === 'F1' ? 1 : ''));
        const d = twoValidators('F1', 'F2');
        const entry = d.validateForm('schema#1', { amount: 1 })['schema#1/amount'];
        assert.equal(entry.status, FieldRuleResult.Error);
    });

    it('collects schema iris from every validator', () => {
        const d = twoValidators('F1', 'F2');
        assert.ok(d.schemas.has('schema#1'));
        assert.equal(d.validators.length, 2);
    });
});
