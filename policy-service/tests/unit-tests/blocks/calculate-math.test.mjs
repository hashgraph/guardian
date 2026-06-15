import { assert } from 'chai';
import { CalculateMathAddon } from '../../../dist/policy-engine/block-validators/blocks/calculate-math-addon.js';
import { CalculateMathVariables } from '../../../dist/policy-engine/block-validators/blocks/calculate-math-variables.js';
import { DataTransformationAddon } from '../../../dist/policy-engine/block-validators/blocks/data-transformation-addon.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this.checked = [];
        this._formulaError = !!opts.formulaError;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    validateFormula() { return !this._formulaError; }
    validateSchemaVariable() { return null; }
    checkBlockError(error) { if (error) this.checked.push(error); }
}

describe('CalculateMathAddon.validate', () => {
    it('passes when no equations are provided', async () => {
        const v = new FakeValidator();
        await CalculateMathAddon.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('passes when every formula is valid', async () => {
        const v = new FakeValidator();
        await CalculateMathAddon.validate(v, {
            options: { equations: [{ variable: 'a', formula: '1+2' }] },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });

    it('flags an invalid formula and bails on the first failure', async () => {
        const v = new FakeValidator({ formulaError: true });
        await CalculateMathAddon.validate(v, {
            options: { equations: [{ variable: 'a', formula: 'oops' }, { variable: 'b', formula: 'never-checked' }] },
            children: [],
        });
        assert.equal(v.errors.length, 1);
        assert.match(v.errors[0], /Incorrect formula: oops/);
    });
});

describe('CalculateMathAddon.getVariables', () => {
    it('returns the supplied variables map untouched when no equations', () => {
        const out = CalculateMathAddon.getVariables({ options: {} }, { x: 'y' });
        assert.deepEqual(out, { x: 'y' });
    });

    it('maps equation.variable → equation.formula into the supplied map', () => {
        const out = CalculateMathAddon.getVariables(
            { options: { equations: [{ variable: 'a', formula: 'x+1' }, { variable: 'b', formula: 'y' }] } },
            {},
        );
        assert.deepEqual(out, { a: 'x+1', b: 'y' });
    });
});

describe('CalculateMathVariables.validate', () => {
    it('flags missing sourceField on a selector', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, {
            options: { selectors: [{ comparisonValue: 'x' }] },
            children: [],
        });
        assert.match(v.errors[0], /Incorrect Source Field/);
    });

    it('flags missing comparisonValue on a selector', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, {
            options: { selectors: [{ sourceField: 'a' }] },
            children: [],
        });
        assert.match(v.errors[0], /Incorrect filter/);
    });

    it('flags variables missing variablePath', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, {
            options: { variables: [{ variableName: 'v' }] },
            children: [],
        });
        assert.match(v.errors[0], /Incorrect Variable Path/);
    });

    it('passes when all selectors and variables are well-formed', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, {
            options: {
                selectors: [{ sourceField: 'a', comparisonValue: '1' }],
                variables: [{ variableName: 'v', variablePath: 'a.b' }],
            },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });
});

describe('CalculateMathVariables.getVariables', () => {
    it('maps variable.variableName → variable.variablePath', () => {
        const out = CalculateMathVariables.getVariables(
            { options: { variables: [{ variableName: 'v1', variablePath: 'a.b' }] } },
            {},
        );
        assert.deepEqual(out, { v1: 'a.b' });
    });

    it('passes through map when variables are absent', () => {
        const out = CalculateMathVariables.getVariables({ options: {} }, { x: 'y' });
        assert.deepEqual(out, { x: 'y' });
    });
});

describe('DataTransformationAddon.validate', () => {
    it('passes empty options (CommonBlock-only delegation)', async () => {
        const v = new FakeValidator();
        await DataTransformationAddon.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});
