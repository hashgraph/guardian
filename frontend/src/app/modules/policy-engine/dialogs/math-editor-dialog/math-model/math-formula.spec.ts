import { MathFormula } from './math-formula';
import { MathItemType } from './math-item.type';

// ─── variable name validation ─────────────────────────────────────────────────
describe('MathFormula._updateName — variable path', () => {
    it('accepts a simple identifier as variable', () => {
        const f = new MathFormula('myVar');
        f.updateName();
        expect(f.validName).toBeTrue();
        expect(f.type).toBe(MathItemType.VARIABLE);
        expect(f.functionName).toBe('myVar');
    });

    it('accepts comma-subscript notation and normalises for CE', () => {
        const f = new MathFormula('fNRB_y,i');
        f.updateName();
        expect(f.validName).toBeTrue();
        expect(f.type).toBe(MathItemType.VARIABLE);
        expect(f.functionName).toBe('fNRB_y_i');
    });

    it('preserves original text in functionNameText', () => {
        const f = new MathFormula('x,i,j');
        f.updateName();
        expect(f.functionNameText).toBe('x,i,j');
        expect(f.functionName).toBe('x_i_j');
    });

    it('rejects name starting with digit', () => {
        const f = new MathFormula('1foo');
        f.updateName();
        expect(f.validName).toBeFalse();
    });

    it('rejects name with space', () => {
        const f = new MathFormula('foo bar');
        f.updateName();
        expect(f.validName).toBeFalse();
    });

    it('rejects empty name', () => {
        const f = new MathFormula('');
        f.updateName();
        expect(f.validName).toBeFalse();
    });

    it('rejects trailing comma', () => {
        const f = new MathFormula('x,');
        f.updateName();
        expect(f.validName).toBeFalse();
    });

    it('rejects leading comma', () => {
        const f = new MathFormula(',x');
        f.updateName();
        expect(f.validName).toBeFalse();
    });
});

// ─── function name validation ─────────────────────────────────────────────────
describe('MathFormula._updateName — function path', () => {
    it('accepts a function with one parameter', () => {
        const f = new MathFormula('myFn(x)');
        f.updateName();
        expect(f.validName).toBeTrue();
        expect(f.type).toBe(MathItemType.FUNCTION);
        expect(f.functionName).toBe('myFn');
        expect(f.functionParams).toEqual(['x']);
    });

    it('accepts a function with multiple parameters', () => {
        const f = new MathFormula('calc(a, b, c)');
        f.updateName();
        expect(f.validName).toBeTrue();
        expect(f.functionParams).toEqual(['a', 'b', 'c']);
    });

    it('rejects function with missing closing paren', () => {
        const f = new MathFormula('myFn(x');
        f.updateName();
        expect(f.validName).toBeFalse();
    });

    it('rejects function name starting with digit', () => {
        const f = new MathFormula('1fn(x)');
        f.updateName();
        expect(f.validName).toBeFalse();
    });
});

// ─── toJson serialisation ─────────────────────────────────────────────────────
describe('MathFormula.toJson', () => {
    it('variable: name is original functionNameText (preserves commas)', () => {
        const f = new MathFormula('x,i');
        f.updateName();
        expect(f.toJson().name).toBe('x,i');
        expect(f.toJson().type).toBe(MathItemType.VARIABLE);
    });

    it('function: name is normalised functionName (no comma notation)', () => {
        const f = new MathFormula('myFn(x)');
        f.updateName();
        expect(f.toJson().name).toBe('myFn');
        expect(f.toJson().type).toBe(MathItemType.FUNCTION);
    });

    it('function: params are included in JSON', () => {
        const f = new MathFormula('calc(a, b)');
        f.updateName();
        expect(f.toJson().params).toEqual(['a', 'b']);
    });
});

// ─── round-trip via MathFormula.from ─────────────────────────────────────────
describe('MathFormula.from — round-trip', () => {
    it('restores variable with comma notation from JSON', () => {
        const original = new MathFormula('fNRB_y,i');
        original.updateName();
        const json = original.toJson();
        const restored = MathFormula.from(json)!;
        restored.updateName();
        expect(restored.functionNameText).toBe('fNRB_y,i');
        expect(restored.functionName).toBe('fNRB_y_i');
        expect(restored.validName).toBeTrue();
        expect(restored.type).toBe(MathItemType.VARIABLE);
    });

    it('restores function from JSON', () => {
        const original = new MathFormula('myFn(x, y)');
        original.updateName();
        const json = original.toJson();
        const restored = MathFormula.from(json)!;
        restored.updateName();
        expect(restored.functionName).toBe('myFn');
        expect(restored.functionParams).toEqual(['x', 'y']);
        expect(restored.type).toBe(MathItemType.FUNCTION);
    });

    it('returns null for invalid input', () => {
        expect(MathFormula.from(null as any)).toBeNull();
        expect(MathFormula.from(undefined as any)).toBeNull();
    });
});
