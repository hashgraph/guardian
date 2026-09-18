import assert from 'node:assert/strict';
import { NodeItemValidator } from '../dist/validators/label-validator/item-node-validator.js';
import { GroupItemValidator } from '../dist/validators/label-validator/item-group-validator.js';
import { LabelItemValidator } from '../dist/validators/label-validator/item-label-validator.js';
import { RuleItemValidator } from '../dist/validators/label-validator/item-rule-validator.js';
import { StatisticItemValidator } from '../dist/validators/label-validator/item-statistic-validator.js';
import { ValidateNamespace } from '../dist/validators/label-validator/namespace.js';
import { ValidateScore } from '../dist/validators/label-validator/score.js';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

const ns = () => new ValidateNamespace('root', []);

describe('NodeItemValidator', () => {
    const item = { id: 'n1', name: 'Node', title: 'Title', tag: 'TAG' };

    it('maps id/name/title/tag and exposes default flags', () => {
        const v = new NodeItemValidator(item);
        assert.equal(v.id, 'n1');
        assert.equal(v.name, 'Node');
        assert.equal(v.title, 'Title');
        assert.equal(v.tag, 'TAG');
        assert.equal(v.type, null);
        assert.equal(v.steps, 0);
        assert.equal(v.isRoot, false);
    });

    it('status is undefined before validation', () => {
        assert.equal(new NodeItemValidator(item).status, undefined);
    });

    it('validate marks the node as unidentified and invalid', () => {
        const v = new NodeItemValidator(item);
        const result = v.validate();
        assert.equal(result.valid, false);
        assert.equal(result.error, 'Unidentified item');
        assert.equal(result.id, 'n1');
        assert.equal(v.status, false);
    });

    it('getStatus returns the last validation result', () => {
        const v = new NodeItemValidator(item);
        v.validate();
        assert.deepEqual(v.getStatus(), { id: 'n1', valid: false, error: 'Unidentified item' });
    });

    it('clear resets the validation status', () => {
        const v = new NodeItemValidator(item);
        v.validate();
        v.clear();
        assert.equal(v.status, undefined);
    });

    it('getSteps yields a single auto validate step bound to the item', () => {
        const v = new NodeItemValidator(item);
        const steps = v.getSteps();
        assert.equal(steps.length, 1);
        assert.equal(steps[0].item, v);
        assert.equal(steps[0].type, 'validate');
        assert.equal(steps[0].auto, true);
        assert.equal(typeof steps[0].validate, 'function');
    });

    it('result/VC accessors are inert on the base node', () => {
        const v = new NodeItemValidator(item);
        assert.equal(v.getResult(), null);
        assert.equal(v.setResult({}), undefined);
        assert.equal(v.getVC(), null);
        assert.equal(v.setVC({}), false);
    });

    it('setData registers a score in the namespace', () => {
        const v = new NodeItemValidator(item);
        v.setData(ns());
        assert.ok(v.getScope() instanceof ValidateScore);
        assert.ok(v.getNamespace() instanceof ValidateNamespace);
    });

    describe('static calculateFormula', () => {
        it('coerces a truthy result to String for string type', () => {
            FormulaEngine.setMathEngine({ evaluate: () => 5 });
            assert.strictEqual(NodeItemValidator.calculateFormula({ formula: 'x', type: 'string' }, {}), '5');
        });

        it('coerces a truthy result to Number for non-string type', () => {
            FormulaEngine.setMathEngine({ evaluate: () => '7' });
            assert.strictEqual(NodeItemValidator.calculateFormula({ formula: 'x', type: 'number' }, {}), 7);
        });

        it('returns a falsy result unchanged without coercion', () => {
            FormulaEngine.setMathEngine({ evaluate: () => 0 });
            assert.strictEqual(NodeItemValidator.calculateFormula({ formula: 'x', type: 'number' }, {}), 0);
        });
    });

    describe('static from dispatch', () => {
        it('creates a GroupItemValidator for type group', () => {
            assert.ok(NodeItemValidator.from({ id: 'g', type: 'group' }) instanceof GroupItemValidator);
        });
        it('creates a LabelItemValidator for type label', () => {
            assert.ok(NodeItemValidator.from({ id: 'l', type: 'label', config: {} }) instanceof LabelItemValidator);
        });
        it('creates a RuleItemValidator for type rules', () => {
            assert.ok(NodeItemValidator.from({ id: 'r', type: 'rules' }) instanceof RuleItemValidator);
        });
        it('creates a StatisticItemValidator for type statistic', () => {
            assert.ok(NodeItemValidator.from({ id: 's', type: 'statistic' }) instanceof StatisticItemValidator);
        });
        it('falls back to NodeItemValidator for an unknown type', () => {
            const v = NodeItemValidator.from({ id: 'x', type: 'mystery' });
            assert.ok(v instanceof NodeItemValidator);
            assert.equal(v.constructor.name, 'NodeItemValidator');
        });
    });

    describe('static fromArray', () => {
        it('maps each config to a validator', () => {
            const arr = NodeItemValidator.fromArray([{ id: 'g', type: 'group' }, { id: 'x', type: '?' }]);
            assert.equal(arr.length, 2);
            assert.ok(arr[0] instanceof GroupItemValidator);
        });
        it('returns [] for a non-array', () => {
            assert.deepEqual(NodeItemValidator.fromArray(undefined), []);
            assert.deepEqual(NodeItemValidator.fromArray(null), []);
        });
    });
});

describe('GroupItemValidator', () => {
    it('applies defaults for name/title/tag/schema and rule Every', () => {
        const g = new GroupItemValidator({ id: 'g1' });
        assert.equal(g.name, '');
        assert.equal(g.title, '');
        assert.equal(g.schema, '');
        assert.equal(g.rule, 'every');
        assert.equal(g.type, 'group');
        assert.deepEqual(g.children, []);
    });

    it('builds child validators from config children', () => {
        const g = new GroupItemValidator({ id: 'g1', children: [{ id: 'c', type: 'group' }] });
        assert.equal(g.children.length, 1);
        assert.ok(g.children[0] instanceof GroupItemValidator);
    });

    it('an empty group validates to true', () => {
        const g = new GroupItemValidator({ id: 'g1' });
        const r = g.validate();
        assert.equal(r.valid, true);
        assert.deepEqual(r.children, []);
    });

    it('rule Every requires every child to be valid', () => {
        const g = new GroupItemValidator({ id: 'g1', rule: 'every' });
        g.children.push({ validate: () => ({ id: 'a', valid: true }) });
        g.children.push({ validate: () => ({ id: 'b', valid: false }) });
        assert.equal(g.validate().valid, false);
    });

    it('rule Every passes when all children are valid', () => {
        const g = new GroupItemValidator({ id: 'g1', rule: 'every' });
        g.children.push({ validate: () => ({ id: 'a', valid: true }) });
        g.children.push({ validate: () => ({ id: 'b', valid: true }) });
        assert.equal(g.validate().valid, true);
    });

    it('rule One passes when at least one child is valid', () => {
        const g = new GroupItemValidator({ id: 'g1', rule: 'one' });
        g.children.push({ validate: () => ({ id: 'a', valid: false }) });
        g.children.push({ validate: () => ({ id: 'b', valid: true }) });
        assert.equal(g.validate().valid, true);
    });

    it('rule One fails when no child is valid', () => {
        const g = new GroupItemValidator({ id: 'g1', rule: 'one' });
        g.children.push({ validate: () => ({ id: 'a', valid: false }) });
        assert.equal(g.validate().valid, false);
    });

    it('collects child results under children', () => {
        const g = new GroupItemValidator({ id: 'g1', rule: 'one' });
        g.children.push({ validate: () => ({ id: 'a', valid: true }) });
        assert.equal(g.validate().children.length, 1);
    });

    it('getResult exposes the current status', () => {
        const g = new GroupItemValidator({ id: 'g1' });
        g.validate();
        assert.deepEqual(g.getResult(), { status: true });
    });

    it('setResult(null) marks invalid document', () => {
        const g = new GroupItemValidator({ id: 'g1' });
        g.setResult(null);
        assert.equal(g.status, false);
        assert.equal(g.getStatus().error, 'Invalid document');
    });

    it('setResult derives validity from document.status', () => {
        const g = new GroupItemValidator({ id: 'g1' });
        g.setResult({ status: true });
        assert.equal(g.status, true);
        g.setResult({ status: false });
        assert.equal(g.status, false);
    });

    it('getVC wraps id, schema and result', () => {
        const g = new GroupItemValidator({ id: 'g1', schemaId: 's#1' });
        g.validate();
        assert.deepEqual(g.getVC(), { id: 'g1', schema: 's#1', document: { status: true } });
    });

    it('setVC applies the document and returns true', () => {
        const g = new GroupItemValidator({ id: 'g1' });
        assert.equal(g.setVC({ status: true }), true);
        assert.equal(g.status, true);
    });

    it('clear resets status', () => {
        const g = new GroupItemValidator({ id: 'g1' });
        g.validate();
        g.clear();
        assert.equal(g.status, undefined);
    });

    it('setData propagates a namespace to children', () => {
        const g = new GroupItemValidator({ id: 'g1', children: [{ id: 'c', type: 'group' }] });
        g.setData(ns());
        assert.ok(g.getScope() instanceof ValidateScore);
        assert.ok(g.children[0].getScope() instanceof ValidateScore);
    });
});

describe('LabelItemValidator', () => {
    const cfg = (over = {}) => ({ id: 'l1', name: 'Lbl', title: 'T', tag: 'LT', schemaId: 's#1', config: { children: [] }, ...over });

    it('maps fields and builds a root group flagged isRoot', () => {
        const v = new LabelItemValidator(cfg());
        assert.equal(v.id, 'l1');
        assert.equal(v.type, 'label');
        assert.equal(v.schema, 's#1');
        assert.ok(v.root instanceof GroupItemValidator);
        assert.equal(v.root.isRoot, true);
    });

    it('resolves schema from config.schemaId when item.schemaId is absent', () => {
        const v = new LabelItemValidator({ id: 'l1', config: { schemaId: 's#cfg', children: [] } });
        assert.equal(v.schema, 's#cfg');
    });

    it('validate delegates to the root group (empty → valid)', () => {
        const v = new LabelItemValidator(cfg());
        assert.equal(v.validate().valid, true);
        assert.equal(v.status, true);
    });

    it('getResult returns the status object', () => {
        const v = new LabelItemValidator(cfg());
        v.validate();
        assert.deepEqual(v.getResult(), { status: true });
    });

    it('setResult(null) marks invalid document', () => {
        const v = new LabelItemValidator(cfg());
        v.setResult(null);
        assert.equal(v.status, false);
        assert.equal(v.getStatus().error, 'Invalid document');
    });

    it('setResult delegates to the root group', () => {
        const v = new LabelItemValidator(cfg());
        v.setResult({ status: true });
        assert.equal(v.status, true);
    });

    it('getVC wraps id, schema and result', () => {
        const v = new LabelItemValidator(cfg());
        v.validate();
        assert.deepEqual(v.getVC(), { id: 'l1', schema: 's#1', document: { status: true } });
    });

    it('setVC applies a document and returns true', () => {
        const v = new LabelItemValidator(cfg());
        assert.equal(v.setVC({ status: true }), true);
    });

    it('clear resets status', () => {
        const v = new LabelItemValidator(cfg());
        v.validate();
        v.clear();
        assert.equal(v.status, undefined);
    });

    it('setData wires the namespace into the root group', () => {
        const v = new LabelItemValidator(cfg());
        v.setData(ns());
        assert.ok(v.getScope() instanceof ValidateScore);
    });
});

describe('RuleItemValidator / StatisticItemValidator constructors', () => {
    for (const [Cls, type, steps] of [[RuleItemValidator, 'rules', 3], [StatisticItemValidator, 'statistic', 3]]) {
        it(`${Cls.name} maps fields and declares ${steps} steps`, () => {
            const v = new Cls({ id: 'x1', name: 'N', title: 'T', tag: 'G', schemaId: 's#1' });
            assert.equal(v.id, 'x1');
            assert.equal(v.name, 'N');
            assert.equal(v.tag, 'G');
            assert.equal(v.schema, 's#1');
            assert.equal(v.type, type);
            assert.equal(v.steps, steps);
            assert.equal(v.isRoot, false);
        });

        it(`${Cls.name} applies empty-string defaults for optional labels`, () => {
            const v = new Cls({ id: 'x1' });
            assert.equal(v.name, '');
            assert.equal(v.title, '');
            assert.equal(v.tag, '');
            assert.equal(v.schema, '');
        });

        it(`${Cls.name} tolerates a missing config and starts with undefined status`, () => {
            const v = new Cls({ id: 'x1' });
            assert.equal(v.status, undefined);
        });

        it(`${Cls.name} setData seeds a score in the namespace`, () => {
            const v = new Cls({ id: 'x1', tag: 'G' });
            v.setData(ns());
            assert.ok(v.getScope() instanceof ValidateScore);
        });
    }
});
