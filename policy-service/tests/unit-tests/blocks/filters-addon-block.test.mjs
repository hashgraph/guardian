import { assert } from 'chai';
import { FiltersAddonBlock } from '../../../dist/policy-engine/block-validators/blocks/filters-addon-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (type) => ({ options: { type }, children: [] });

describe('FiltersAddonBlock.validate', () => {
    it('accepts dropdown / datepicker / input', async () => {
        for (const t of ['dropdown', 'datepicker', 'input']) {
            const v = new FakeValidator();
            await FiltersAddonBlock.validate(v, refWith(t));
            assert.deepEqual(v.errors, []);
        }
    });

    it('rejects an unknown type', async () => {
        const v = new FakeValidator();
        await FiltersAddonBlock.validate(v, refWith('checkbox'));
        assert.include(v.errors, 'Option "type" must be a "dropdown"');
    });

    it('rejects when type is missing', async () => {
        const v = new FakeValidator();
        await FiltersAddonBlock.validate(v, refWith(undefined));
        assert.include(v.errors, 'Option "type" is not set');
    });
});
