import assert from 'node:assert/strict';
import { StatisticItemValidator } from '../dist/validators/label-validator/item-statistic-validator.js';
import { ValidateNamespace } from '../dist/validators/label-validator/namespace.js';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

function engine(map) {
    FormulaEngine.setMathEngine({ evaluate: (expr) => (expr in map ? map[expr] : expr) });
}

const docNamespace = (amount) =>
    new ValidateNamespace('root', [{ schema: 's#1', document: { credentialSubject: { amount } } }]);

function makeValidator(over = {}) {
    return new StatisticItemValidator({
        id: 's1', name: 'Stat', title: 'Stat title', tag: 'S1', schemaId: 's#1',
        config: {
            variables: [{ id: 'v1', schemaId: 's#1', path: 'amount' }],
            scores: [{ id: 'sc1', type: 't', description: 'd', relationships: ['v1'], options: [] }],
            formulas: [{ id: 'f1', type: 'number', formula: 'fx' }],
            ...over
        }
    });
}

describe('StatisticItemValidator — data flow', () => {
    it('updateVariables pulls field values into the scope', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        v.updateVariables();
        assert.equal(v.getScope().getScore().v1, 8);
    });

    it('validate defaults to valid:true', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        assert.equal(v.validate().valid, true);
    });

    it('validate preserves an existing invalid status', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        v.setResult(null);
        assert.equal(v.validate().valid, false);
    });
});

describe('StatisticItemValidator — validation steps', () => {
    it('validateVariables passes after updateVariables', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        v.updateVariables();
        assert.equal(v.validateVariables().valid, true);
    });

    it('validateVariables fails with "Invalid variable" when stale', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        const r = v.validateVariables();
        assert.equal(r.valid, false);
        assert.equal(r.error, 'Invalid variable');
    });

    it('validateFormulas fails with "Invalid formula" when the stored value is stale', () => {
        engine({ fx: 5 });
        const v = makeValidator();
        v.setData(docNamespace(8));
        const r = v.validateFormulas();
        assert.equal(r.valid, false);
        assert.equal(r.error, 'Invalid formula');
    });

    it('validateFormulas passes after updateFormulas computes the same value', () => {
        engine({ fx: 5 });
        const v = makeValidator();
        v.setData(docNamespace(8));
        v.updateFormulas();
        assert.equal(v.validateFormulas().valid, true);
    });
});

describe('StatisticItemValidator — result round-trip', () => {
    it('getResult has no status field and omits undefined values', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        const result = v.getResult();
        assert.equal('status' in result, false);
        assert.equal('v1' in result, false);
    });

    it('setResult(null) marks the item invalid', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        v.setResult(null);
        assert.equal(v.status, false);
        assert.equal(v.getStatus().error, 'Invalid document');
    });

    it('setResult loads values and always marks valid:true', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        v.setResult({ status: false, v1: 9, f1: 3 });
        assert.equal(v.status, true);
        const result = v.getResult();
        assert.equal(result.v1, 9);
        assert.equal(result.f1, 3);
    });

    it('getVC wraps id, schema and the result', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        const vc = v.getVC();
        assert.equal(vc.id, 's1');
        assert.equal(vc.schema, 's#1');
    });

    it('setVC delegates to setResult and returns true', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        assert.equal(v.setVC({ v1: 1 }), true);
        assert.equal(v.status, true);
    });

    it('clear resets the status', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        v.validate();
        v.clear();
        assert.equal(v.status, undefined);
    });
});

describe('StatisticItemValidator — getSteps', () => {
    it('emits the three substeps plus a final validate step', () => {
        engine({});
        const v = makeValidator();
        v.setData(docNamespace(8));
        assert.deepEqual(v.getSteps().map((s) => s.type), ['variables', 'scores', 'formulas', 'validate']);
    });

    it('emits only the validate step when there is no config', () => {
        engine({});
        const v = new StatisticItemValidator({ id: 's1', tag: 'S1' });
        v.setData(docNamespace(8));
        assert.equal(v.getSteps().length, 1);
    });
});
