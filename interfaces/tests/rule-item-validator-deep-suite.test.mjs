import assert from 'node:assert/strict';
import { RuleItemValidator } from '../dist/validators/label-validator/item-rule-validator.js';
import { ValidateNamespace } from '../dist/validators/label-validator/namespace.js';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

function engine(map) {
    FormulaEngine.setMathEngine({ evaluate: (expr) => (expr in map ? map[expr] : expr) });
}

const docNamespace = (amount) =>
    new ValidateNamespace('root', [{ schema: 's#1', document: { credentialSubject: { amount } } }]);

function makeValidator(over = {}) {
    return new RuleItemValidator({
        id: 'r1', name: 'Rule', title: 'Rule title', tag: 'R1', schemaId: 's#1',
        config: {
            variables: [{ id: 'v1', schemaId: 's#1', path: 'amount' }],
            scores: [{ id: 'sc1', type: 't', description: 'd', relationships: ['v1'], options: [{ description: 'Low', value: 1 }] }],
            formulas: [{ id: 'f1', type: 'number', formula: 'fx', rule: { type: 'formula', formula: 'COND' } }],
            ...over
        }
    });
}

describe('RuleItemValidator — data flow', () => {
    it('updateVariables pulls field values from the namespace into the scope', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(5));
        v.updateVariables();
        assert.equal(v.getScope().getScore().v1, 5);
    });

    it('validate passes when no formula condition fails', () => {
        engine({ COND: 1 });
        const v = makeValidator();
        v.setData(docNamespace(5));
        const r = v.validate();
        assert.equal(r.valid, true);
        assert.equal(v.status, true);
    });

    it('validate fails with "Invalid condition" when a formula evaluates to Failure', () => {
        engine({ COND: 0 });
        const v = makeValidator();
        v.setData(docNamespace(5));
        const r = v.validate();
        assert.equal(r.valid, false);
        assert.equal(r.error, 'Invalid condition');
    });

    it('validate fails with "Invalid condition" when a formula evaluates to Error', () => {
        engine({ COND: '' });
        const v = makeValidator();
        v.setData(docNamespace(5));
        assert.equal(v.validate().valid, false);
    });

    it('validate short-circuits when a prior Invalid document status is set', () => {
        engine({ COND: 1 });
        const v = makeValidator();
        v.setData(docNamespace(5));
        v.setResult(null);
        const r = v.validate();
        assert.equal(r.error, 'Invalid document');
    });
});

describe('RuleItemValidator — validateVariables', () => {
    it('passes after updateVariables aligns stored values with the document', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(5));
        v.updateVariables();
        assert.equal(v.validateVariables().valid, true);
    });

    it('fails with "Invalid variable" when stored value differs from the field', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(5));
        const r = v.validateVariables();
        assert.equal(r.valid, false);
        assert.equal(r.error, 'Invalid variable');
    });
});

describe('RuleItemValidator — getResult / setResult round-trip', () => {
    it('setResult(null) marks the item invalid', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(5));
        v.setResult(null);
        assert.equal(v.status, false);
        assert.equal(v.getStatus().error, 'Invalid document');
    });

    it('setResult loads variable/score/formula values and derives status', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(5));
        v.setResult({ status: true, v1: 9, f1: 42 });
        const result = v.getResult();
        assert.equal(result.status, true);
        assert.equal(result.v1, 9);
        assert.equal(result.f1, 42);
    });

    it('getResult omits values that are undefined', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(5));
        v.setResult({ status: false });
        const result = v.getResult();
        assert.equal(result.status, false);
        assert.equal('v1' in result, false);
    });

    it('getVC wraps id, schema and the result document', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(5));
        v.validate();
        const vc = v.getVC();
        assert.equal(vc.id, 'r1');
        assert.equal(vc.schema, 's#1');
        assert.equal(typeof vc.document, 'object');
    });

    it('setVC delegates to setResult and returns true', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(5));
        assert.equal(v.setVC({ status: true, v1: 3 }), true);
        assert.equal(v.status, true);
    });

    it('clear resets the status', () => {
        engine({ COND: 1 });
        const v = makeValidator();
        v.setData(docNamespace(5));
        v.validate();
        v.clear();
        assert.equal(v.status, undefined);
    });
});

describe('RuleItemValidator — getSteps', () => {
    it('emits Overview/Scores/Statistics substeps plus a final validate step', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(5));
        const steps = v.getSteps();
        assert.equal(steps.length, 4);
        assert.deepEqual(steps.map((s) => s.type), ['variables', 'scores', 'formulas', 'validate']);
        assert.equal(steps[3].auto, true);
    });

    it('the final validate step is the only one when there is no config', () => {
        engine({});
        const v = new RuleItemValidator({ id: 'r1', tag: 'R1' });
        v.setData(docNamespace(5));
        const steps = v.getSteps();
        assert.equal(steps.length, 1);
        assert.equal(steps[0].type, 'validate');
    });

    it('each substep marks its own subIndex as selected', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(5));
        const steps = v.getSteps();
        const overview = steps.find((s) => s.type === 'variables');
        const selected = overview.subIndexes.find((i) => i.selected);
        assert.equal(selected.name, 'Overview');
    });
});
