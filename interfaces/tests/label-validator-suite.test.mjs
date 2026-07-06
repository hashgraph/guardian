import assert from 'node:assert/strict';
import { ValidateScore } from '../dist/validators/label-validator/score.js';
import { ValidateNamespace } from '../dist/validators/label-validator/namespace.js';
import { FormulaValidator } from '../dist/validators/label-validator/variable-validator.js';
import { FieldRuleResult } from '../dist/validators/rule-validator/interfaces/status.js';
import { FormulaEngine } from '../dist/validators/utils/formula.js';

describe('ValidateScore', () => {
    it('exposes id and name from the constructor', () => {
        const s = new ValidateScore('id1', 'nameA');
        assert.equal(s.id, 'id1');
        assert.equal(s.name, 'nameA');
    });

    it('starts with an empty score object and name list', () => {
        const s = new ValidateScore('id1', 'nameA');
        assert.deepEqual(s.getScore(), {});
        assert.deepEqual(s.getName(), []);
    });

    it('setVariable accumulates keyed values', () => {
        const s = new ValidateScore('id1', 'nameA');
        s.setVariable('x', 1);
        s.setVariable('y', 2);
        assert.deepEqual(s.getScore(), { x: 1, y: 2 });
    });

    it('setVariable overwrites an existing key', () => {
        const s = new ValidateScore('id1', 'nameA');
        s.setVariable('x', 1);
        s.setVariable('x', 9);
        assert.deepEqual(s.getScore(), { x: 9 });
    });

    it('setName appends to the names list preserving order', () => {
        const s = new ValidateScore('id1', 'nameA');
        s.setName('a');
        s.setName('b');
        assert.deepEqual(s.getName(), ['a', 'b']);
    });
});

describe('ValidateNamespace', () => {
    it('createNamespaces returns a child namespace sharing documents', () => {
        const root = new ValidateNamespace('root', [{ schema: 's1' }]);
        const child = root.createNamespaces('child');
        assert.ok(child instanceof ValidateNamespace);
        assert.equal(child.name, 'child');
    });

    it('createScore returns a ValidateScore', () => {
        const ns = new ValidateNamespace('root', []);
        const score = ns.createScore('sc1', 'metric');
        assert.ok(score instanceof ValidateScore);
        assert.equal(score.id, 'sc1');
    });

    it('getNamespace aggregates all score values keyed by score name', () => {
        const ns = new ValidateNamespace('root', []);
        const a = ns.createScore('1', 'a');
        a.setVariable('x', 1);
        const b = ns.createScore('2', 'b');
        b.setVariable('y', 2);
        assert.deepEqual(ns.getNamespace(), { a: { x: 1 }, b: { y: 2 } });
    });

    it('getNamespace(id) stops accumulating once it reaches the matching score', () => {
        const ns = new ValidateNamespace('root', []);
        const a = ns.createScore('1', 'a');
        a.setVariable('x', 1);
        const b = ns.createScore('2', 'b');
        b.setVariable('y', 2);
        assert.deepEqual(ns.getNamespace('2'), { a: { x: 1 } });
    });

    it('getNames returns dotted "scoreName.key" entries from registered names', () => {
        const ns = new ValidateNamespace('root', []);
        const a = ns.createScore('1', 'a');
        a.setName('x');
        a.setName('z');
        assert.deepEqual(ns.getNames().sort(), ['a.x', 'a.z']);
    });

    it('getNames(id) stops at the matching score', () => {
        const ns = new ValidateNamespace('root', []);
        const a = ns.createScore('1', 'a');
        a.setName('x');
        const b = ns.createScore('2', 'b');
        b.setName('y');
        assert.deepEqual(ns.getNames('2'), ['a.x']);
    });

    it('getField resolves a dotted path inside the matching document subject', () => {
        const docs = [{ schema: 's1', document: { credentialSubject: { a: { b: 5 } } } }];
        const ns = new ValidateNamespace('root', docs);
        assert.equal(ns.getField('s1', 'a.b'), 5);
    });

    it('getField unwraps an array credential subject', () => {
        const docs = [{ schema: 's1', document: { credentialSubject: [{ a: 7 }] } }];
        const ns = new ValidateNamespace('root', docs);
        assert.equal(ns.getField('s1', 'a'), 7);
    });

    it('getField returns undefined when the schema is not present', () => {
        const ns = new ValidateNamespace('root', [{ schema: 's1', document: {} }]);
        assert.equal(ns.getField('other', 'a'), undefined);
    });

    it('getField returns undefined when the path cannot be resolved', () => {
        const docs = [{ schema: 's1', document: { credentialSubject: { a: 1 } } }];
        const ns = new ValidateNamespace('root', docs);
        assert.equal(ns.getField('s1', 'a.b.c'), undefined);
    });
});

describe('FormulaValidator', () => {
    it('wraps a formula rule and validates via the rule engine', () => {
        FormulaEngine.setMathEngine({ evaluate: () => 1 });
        const fv = new FormulaValidator({ id: 'f1', rule: { type: 'formula', formula: 'x' } });
        assert.equal(fv.id, 'f1');
        assert.equal(fv.validate({ x: 1 }), FieldRuleResult.Success);
    });

    it('validates to None when the formula has no rule', () => {
        FormulaEngine.setMathEngine({ evaluate: () => 1 });
        const fv = new FormulaValidator({ id: 'f1', rule: null });
        assert.equal(fv.validate({}), FieldRuleResult.None);
    });
});
