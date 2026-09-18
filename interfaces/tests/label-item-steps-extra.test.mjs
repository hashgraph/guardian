import assert from 'node:assert/strict';
import { RuleItemValidator } from '../dist/validators/label-validator/item-rule-validator.js';
import { StatisticItemValidator } from '../dist/validators/label-validator/item-statistic-validator.js';
import { GroupItemValidator } from '../dist/validators/label-validator/item-group-validator.js';
import { LabelItemValidator } from '../dist/validators/label-validator/item-label-validator.js';
import { ValidateNamespace } from '../dist/validators/label-validator/namespace.js';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

const engine = (map) =>
    FormulaEngine.setMathEngine({ evaluate: (expr) => (expr in map ? map[expr] : expr) });

const ns = (amount) =>
    new ValidateNamespace('root', [{ schema: 's#1', document: { credentialSubject: { amount } } }]);

const config = () => ({
    variables: [{ id: 'v1', schemaId: 's#1', path: 'amount' }],
    scores: [{ id: 'sc1', type: 't', description: 'd', relationships: ['v1'], options: [{ description: 'Low', value: 1 }] }],
    formulas: [{ id: 'f1', type: 'number', formula: 'fx', rule: { type: 'formula', formula: 'COND' } }],
});

const makeRule = () =>
    new RuleItemValidator({ id: 'r1', name: 'Rule', title: 'Rule', tag: 'R1', schemaId: 's#1', config: config() });

const makeStat = () =>
    new StatisticItemValidator({ id: 's1', name: 'Stat', title: 'Stat', tag: 'S1', schemaId: 's#1', config: config() });

describe('RuleItemValidator step updates', () => {
    it('updateScores writes current variable values into the scope', () => {
        engine({});
        const v = makeRule();
        v.setData(ns(5));
        v.variables[0].setValue(7);
        v.updateScores();
        assert.equal(v.getScope().getScore().v1, 7);
    });

    it('updateFormulas computes formula values and stores them', () => {
        engine({ fx: 3 });
        const v = makeRule();
        v.setData(ns(5));
        v.updateFormulas();
        assert.equal(v.formulas[0].getValue(), 3);
        assert.equal(v.getScope().getScore().f1, 3);
    });

    it('updateFormulas exposes score values to the scope', () => {
        engine({ fx: 3 });
        const v = makeRule();
        v.setData(ns(5));
        v.scores[0].setValue('Low');
        v.updateFormulas();
        assert.equal(v.getScope().getScore().sc1, 1);
    });

    it('getNamespace returns the bound namespace', () => {
        engine({});
        const v = makeRule();
        const namespace = ns(5);
        v.setData(namespace);
        assert.equal(v.getNamespace(), namespace);
    });
});

describe('RuleItemValidator.validateScores', () => {
    it('passes when every score holds a valid option value', () => {
        engine({});
        const v = makeRule();
        v.setData(ns(5));
        v.scores[0].setValue('Low');
        assert.equal(v.validateScores().valid, true);
    });

    it('fails with "Invalid scores" when a score value is unset', () => {
        engine({});
        const v = makeRule();
        v.setData(ns(5));
        const r = v.validateScores();
        assert.equal(r.valid, false);
        assert.equal(r.error, 'Invalid scores');
    });

    it('short-circuits when an Invalid document status is present', () => {
        engine({});
        const v = makeRule();
        v.setData(ns(5));
        v.setResult(null);
        assert.equal(v.validateScores().error, 'Invalid document');
    });
});

describe('RuleItemValidator.validateFormulas', () => {
    it('passes when stored formula values match recomputed ones', () => {
        engine({ fx: 3 });
        const v = makeRule();
        v.setData(ns(5));
        v.updateFormulas();
        assert.equal(v.validateFormulas().valid, true);
    });

    it('fails with "Invalid formula" when stored values are stale', () => {
        engine({ fx: 3 });
        const v = makeRule();
        v.setData(ns(5));
        const r = v.validateFormulas();
        assert.equal(r.valid, false);
        assert.equal(r.error, 'Invalid formula');
    });

    it('short-circuits when an Invalid document status is present', () => {
        engine({ fx: 3 });
        const v = makeRule();
        v.setData(ns(5));
        v.setResult(null);
        assert.equal(v.validateFormulas().error, 'Invalid document');
    });
});

describe('StatisticItemValidator step updates', () => {
    it('updateScores writes current variable values into the scope', () => {
        engine({});
        const v = makeStat();
        v.setData(ns(5));
        v.variables[0].setValue(8);
        v.updateScores();
        assert.equal(v.getScope().getScore().v1, 8);
    });

    it('updateFormulas computes and stores formula values', () => {
        engine({ fx: 4 });
        const v = makeStat();
        v.setData(ns(5));
        v.updateFormulas();
        assert.equal(v.formulas[0].getValue(), 4);
        assert.equal(v.getScope().getScore().f1, 4);
    });

    it('getNamespace returns the bound namespace', () => {
        engine({});
        const v = makeStat();
        const namespace = ns(5);
        v.setData(namespace);
        assert.equal(v.getNamespace(), namespace);
    });
});

describe('StatisticItemValidator validations', () => {
    it('validateScores passes for valid option values', () => {
        engine({});
        const v = makeStat();
        v.setData(ns(5));
        v.scores[0].setValue('Low');
        assert.equal(v.validateScores().valid, true);
    });

    it('validateScores fails with "Invalid scores" otherwise', () => {
        engine({});
        const v = makeStat();
        v.setData(ns(5));
        const r = v.validateScores();
        assert.equal(r.valid, false);
        assert.equal(r.error, 'Invalid scores');
    });

    it('validateFormulas passes after updateFormulas', () => {
        engine({ fx: 4 });
        const v = makeStat();
        v.setData(ns(5));
        v.updateFormulas();
        assert.equal(v.validateFormulas().valid, true);
    });

    it('validateFormulas fails with "Invalid formula" on stale values', () => {
        engine({ fx: 4 });
        const v = makeStat();
        v.setData(ns(5));
        const r = v.validateFormulas();
        assert.equal(r.error, 'Invalid formula');
    });

    it('validateVariables returns a prior failed result unchanged', () => {
        engine({});
        const v = makeStat();
        v.setData(ns(5));
        const failed = v.validateScores();
        const r = v.validateVariables();
        assert.equal(r, failed);
        assert.equal(r.error, 'Invalid scores');
    });

    it('validateScores returns a prior failed result unchanged', () => {
        engine({});
        const v = makeStat();
        v.setData(ns(5));
        const failed = v.validateVariables();
        assert.equal(failed.error, 'Invalid variable');
        assert.equal(v.validateScores(), failed);
    });

    it('validateFormulas returns a prior failed result unchanged', () => {
        engine({});
        const v = makeStat();
        v.setData(ns(5));
        const failed = v.validateVariables();
        assert.equal(v.validateFormulas(), failed);
    });
});

describe('Group and Label namespace accessors', () => {
    it('GroupItemValidator.getNamespace returns the bound namespace', () => {
        const g = new GroupItemValidator({ id: 'g1', children: [] });
        const namespace = ns(1);
        g.setData(namespace);
        assert.equal(g.getNamespace(), namespace);
        assert.ok(g.getScope());
    });

    it('LabelItemValidator.getNamespace returns the bound namespace', () => {
        const l = new LabelItemValidator({ id: 'l1', name: 'L', config: { children: [] } });
        const namespace = ns(1);
        l.setData(namespace);
        assert.equal(l.getNamespace(), namespace);
        assert.ok(l.getScope());
    });
});
