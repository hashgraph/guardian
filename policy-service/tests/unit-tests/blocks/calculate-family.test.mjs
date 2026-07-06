import { assert } from 'chai';
import { CalculateMathAddon } from '../../../dist/policy-engine/block-validators/blocks/calculate-math-addon.js';
import { CalculateMathVariables } from '../../../dist/policy-engine/block-validators/blocks/calculate-math-variables.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this.checked = [];
        this._formulaError = !!opts.formulaError;
        this._schemaResult = opts.schemaResult ?? null;
        this._throw = !!opts.throwGetArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async getArtifact() { if (this._throw) { throw new Error('artifact-down'); } return {}; }
    validateFormula() { return !this._formulaError; }
    validateSchemaVariable() { return this._schemaResult; }
    checkBlockError(error) { if (error) { this.checked.push(error); } }
}

const ref = (options) => ({ options, children: [] });

describe('@unit P0 CalculateMathAddon extra', () => {
    it('blockType is calculateMathAddon', () => {
        assert.equal(CalculateMathAddon.blockType, 'calculateMathAddon');
    });

    it('passes for an empty equations array', async () => {
        const v = new FakeValidator();
        await CalculateMathAddon.validate(v, ref({ equations: [] }));
        assert.deepEqual(v.errors, []);
    });

    it('validates every formula when all are correct', async () => {
        const v = new FakeValidator();
        await CalculateMathAddon.validate(v, ref({
            equations: [
                { variable: 'a', formula: 'x+1' },
                { variable: 'b', formula: 'y*2' },
                { variable: 'c', formula: 'z' },
            ],
        }));
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception from artifact lookup', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await CalculateMathAddon.validate(v, {
            options: { artifacts: [{ uuid: 'a' }], equations: [] },
            children: [],
        });
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });

    it('getVariables overwrites an existing key for a duplicate variable name', () => {
        const out = CalculateMathAddon.getVariables(
            { options: { equations: [{ variable: 'a', formula: 'first' }, { variable: 'a', formula: 'second' }] } },
            {},
        );
        assert.deepEqual(out, { a: 'second' });
    });

    it('getVariables preserves unrelated keys already in the map', () => {
        const out = CalculateMathAddon.getVariables(
            { options: { equations: [{ variable: 'new', formula: 'f' }] } },
            { existing: 'keep' },
        );
        assert.deepEqual(out, { existing: 'keep', new: 'f' });
    });

    it('getVariables returns the same object reference it was given', () => {
        const seed = {};
        const out = CalculateMathAddon.getVariables({ options: {} }, seed);
        assert.strictEqual(out, seed);
    });

    it('getVariables with empty equations leaves map untouched', () => {
        const out = CalculateMathAddon.getVariables({ options: { equations: [] } }, { k: 'v' });
        assert.deepEqual(out, { k: 'v' });
    });
});

describe('@unit P0 CalculateMathVariables extra', () => {
    it('blockType is calculateMathVariables', () => {
        assert.equal(CalculateMathVariables.blockType, 'calculateMathVariables');
    });

    it('passes when neither selectors nor variables are present', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });

    it('routes sourceSchema result through checkBlockError', async () => {
        const v = new FakeValidator({ schemaResult: 'bad source schema' });
        await CalculateMathVariables.validate(v, ref({}));
        assert.include(v.checked, 'bad source schema');
    });

    it('does not record a schema error when validateSchemaVariable returns null', async () => {
        const v = new FakeValidator({ schemaResult: null });
        await CalculateMathVariables.validate(v, ref({}));
        assert.deepEqual(v.checked, []);
    });

    it('selector with sourceField but no comparisonValue short-circuits before variables', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, ref({
            selectors: [{ sourceField: 'a' }],
            variables: [{ variableName: 'x' }],
        }));
        assert.equal(v.errors.length, 1);
        assert.match(v.errors[0], /Incorrect filter/);
    });

    it('valid selectors then bad variable path reports the variable error', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, ref({
            selectors: [{ sourceField: 'a', comparisonValue: '1' }],
            variables: [{ variableName: 'x' }],
        }));
        assert.equal(v.errors.length, 1);
        assert.match(v.errors[0], /Incorrect Variable Path/);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await CalculateMathVariables.validate(v, {
            options: { artifacts: [{ uuid: 'a' }] },
            children: [],
        });
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });

    it('getVariables maps multiple variables into the map', () => {
        const out = CalculateMathVariables.getVariables(
            { options: { variables: [
                { variableName: 'a', variablePath: 'p.a' },
                { variableName: 'b', variablePath: 'p.b' },
            ] } },
            {},
        );
        assert.deepEqual(out, { a: 'p.a', b: 'p.b' });
    });

    it('getVariables overwrites duplicate variable names with the last path', () => {
        const out = CalculateMathVariables.getVariables(
            { options: { variables: [
                { variableName: 'a', variablePath: 'first' },
                { variableName: 'a', variablePath: 'last' },
            ] } },
            {},
        );
        assert.deepEqual(out, { a: 'last' });
    });

    it('getVariables returns the same map reference', () => {
        const seed = { z: '1' };
        const out = CalculateMathVariables.getVariables({ options: {} }, seed);
        assert.strictEqual(out, seed);
    });
});
