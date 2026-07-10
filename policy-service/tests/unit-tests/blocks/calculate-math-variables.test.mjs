import { assert } from 'chai';
import { CalculateMathVariables } from '../../../dist/policy-engine/block-validators/blocks/calculate-math-variables.js';

class FakeValidator {
    constructor({ schemas = new Set() } = {}) {
        this.errors = [];
        this.schemas = schemas;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    validateSchemaVariable(name, value, required) {
        if (required && !value) return `Option "${name}" is not set`;
        if (value && !this.schemas.has(value)) return `Schema "${value}" not exist`;
        return null;
    }
    checkBlockError(err) { if (err) this.errors.push(err); }
}

describe('CalculateMathVariables.validate', () => {
    it('exposes blockType "calculateMathVariables"', () => {
        assert.equal(CalculateMathVariables.blockType, 'calculateMathVariables');
    });

    it('passes for an empty options object', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, { options: {} });
        assert.deepEqual(v.errors, []);
    });

    it('rejects a selector entry missing sourceField', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, { options: { selectors: [{ comparisonValue: 1 }] } });
        assert.include(v.errors.join('\n'), 'Incorrect Source Field');
    });

    it('rejects a selector entry missing comparisonValue', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, { options: { selectors: [{ sourceField: 'a' }] } });
        assert.include(v.errors.join('\n'), 'Incorrect filter');
    });

    it('rejects a variable entry missing variablePath', async () => {
        const v = new FakeValidator();
        await CalculateMathVariables.validate(v, { options: { variables: [{ /* no path */ }] } });
        assert.include(v.errors.join('\n'), 'Incorrect Variable Path');
    });

    it('reports unknown sourceSchema (optional)', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await CalculateMathVariables.validate(v, { options: { sourceSchema: '#Bad' } });
        assert.include(v.errors, 'Schema "#Bad" not exist');
    });
});
