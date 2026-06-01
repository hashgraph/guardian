import assert from 'node:assert/strict';
import { MathEngine } from '../../../dist/policy-engine/helpers/math-model/math-engine.js';
import { MathItemType } from '../../../dist/policy-engine/helpers/math-model/math-item.type.js';

const addVariable = (engine, name, field) => {
    const v = engine.addVariable(name, field);
    v.update();
    return v;
};

const addOutput = (engine, name, field) => {
    const o = engine.addOutput();
    o.variableNameText = name;
    o.field = field;
    o.update();
    return o;
};

describe('MathEngine — structure', () => {
    it('starts with one empty page per group and no items', () => {
        const engine = new MathEngine();
        assert.equal(engine.variables.pages.length, 1);
        assert.equal(engine.formulas.pages.length, 1);
        assert.equal(engine.outputs.pages.length, 1);
        assert.equal(engine.getItems().length, 0);
    });

    it('addVariable registers a LINK item on the current page', () => {
        const engine = new MathEngine();
        const v = engine.addVariable('x', 'doc.a');
        assert.equal(v.type, MathItemType.LINK);
        assert.ok(engine.variables.pages[0].items.includes(v));
    });

    it('addFormula registers a formula item on the current page', () => {
        const engine = new MathEngine();
        const f = engine.addFormula('f', '1+1');
        assert.ok(engine.formulas.pages[0].items.includes(f));
    });

    it('addOutput registers a LINK output on the current page', () => {
        const engine = new MathEngine();
        const o = engine.addOutput();
        assert.equal(o.type, MathItemType.LINK);
        assert.ok(engine.outputs.pages[0].items.includes(o));
    });

    it('deleteVariable / deleteFormula / deleteOutput remove the item', () => {
        const engine = new MathEngine();
        const v = engine.addVariable('x', 'doc.a');
        const f = engine.addFormula('f', '1+1');
        const o = engine.addOutput();
        engine.deleteVariable(v);
        engine.deleteFormula(f);
        engine.deleteOutput(o);
        assert.equal(engine.variables.pages[0].items.length, 0);
        assert.equal(engine.formulas.pages[0].items.length, 0);
        assert.equal(engine.outputs.pages[0].items.length, 0);
    });

    it('getItems excludes empty (un-updated) items', () => {
        const engine = new MathEngine();
        addVariable(engine, 'x', 'doc.a');
        engine.addVariable('y', 'doc.b');
        addOutput(engine, 'x', 'doc.c');
        assert.equal(engine.getItems().length, 2);
    });

    it('toJson exposes variables, formulas and outputs arrays', () => {
        const engine = new MathEngine();
        const json = engine.toJson();
        assert.deepEqual(Object.keys(json), ['variables', 'formulas', 'outputs']);
        assert.ok(Array.isArray(json.variables));
        assert.ok(Array.isArray(json.formulas));
        assert.ok(Array.isArray(json.outputs));
    });
});

describe('MathEngine.validate', () => {
    it('returns null for an empty engine', () => {
        assert.equal(new MathEngine().validate(), null);
    });

    it('returns null when a variable and a matching output are valid', () => {
        const engine = new MathEngine();
        addVariable(engine, 'x', 'doc.a');
        addOutput(engine, 'x', 'doc.b');
        assert.equal(engine.validate(), null);
    });

    it('flags duplicate variable names with the offending page id', () => {
        const engine = new MathEngine();
        addVariable(engine, 'dup', 'doc.a');
        addVariable(engine, 'dup', 'doc.b');
        assert.deepEqual(engine.validate(), ['variables', engine.variables.pages[0].id]);
    });

    it('marks both duplicates invalid with a "Duplicate name" error', () => {
        const engine = new MathEngine();
        const a = addVariable(engine, 'dup', 'doc.a');
        const b = addVariable(engine, 'dup', 'doc.b');
        engine.validate();
        assert.equal(a.validName, false);
        assert.equal(b.validName, false);
        assert.equal(a.error, 'Duplicate name');
        assert.equal(b.error, 'Duplicate name');
    });

    it('flags an output that references an unknown variable', () => {
        const engine = new MathEngine();
        addOutput(engine, 'missing', 'doc.x');
        assert.deepEqual(engine.validate(), ['outputs', engine.outputs.pages[0].id]);
    });
});

describe('MathEngine.createContext', () => {
    it('returns a usable context when the model is valid', () => {
        const engine = new MathEngine();
        addVariable(engine, 'x', 'doc.a');
        addOutput(engine, 'x', 'doc.b');
        const ctx = engine.createContext();
        assert.notEqual(ctx, null);
        assert.equal(typeof ctx.setDocument, 'function');
    });

    it('returns null when the model is invalid', () => {
        const engine = new MathEngine();
        addVariable(engine, 'dup', 'doc.a');
        addVariable(engine, 'dup', 'doc.b');
        assert.equal(engine.createContext(), null);
    });
});

describe('MathEngine.reorder', () => {
    it('is a no-op when previousIndex === currentIndex', () => {
        const engine = new MathEngine();
        addVariable(engine, 'x', 'doc.a');
        assert.doesNotThrow(() => engine.reorder('variables', 0, 0));
        assert.equal(engine.getItems().length, 1);
    });

    it('does not throw for variables / formulas / outputs', () => {
        const engine = new MathEngine();
        addVariable(engine, 'x', 'doc.a');
        addVariable(engine, 'y', 'doc.b');
        assert.doesNotThrow(() => engine.reorder('variables', 0, 1));
        assert.doesNotThrow(() => engine.reorder('formulas', 0, 1));
        assert.doesNotThrow(() => engine.reorder('outputs', 0, 1));
    });
});

describe('MathEngine.from / static from', () => {
    it('static from(null) returns null', () => {
        assert.equal(MathEngine.from(null), null);
    });

    it('instance from(null) returns the same engine unchanged', () => {
        const engine = new MathEngine();
        assert.equal(engine.from(null), engine);
    });

    it('rehydrates variables from a flat JSON config', () => {
        const json = {
            variables: [{ type: MathItemType.LINK, name: 'x', field: 'doc.a', schema: 's-1', description: '' }],
            formulas: [],
            outputs: [],
        };
        const engine = MathEngine.from(json);
        assert.notEqual(engine, null);
        const items = engine.variables.getItems();
        assert.equal(items.length, 1);
        assert.equal(items[0].path, 'doc.a');
        assert.equal(items[0].schema, 's-1');
    });

    it('round-trips a populated engine through toJson then from', () => {
        const source = new MathEngine();
        addVariable(source, 'x', 'doc.a');
        addOutput(source, 'x', 'doc.b');
        const restored = MathEngine.from(source.toJson());
        assert.notEqual(restored, null);
        assert.equal(restored.variables.getItems().length, 1);
        assert.equal(restored.outputs.getItems().length, 1);
    });
});
