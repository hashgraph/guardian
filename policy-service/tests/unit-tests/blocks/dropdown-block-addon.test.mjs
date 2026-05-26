import { assert } from 'chai';
import { DropdownBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/dropdown-block-addon.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

describe('DropdownBlockAddon.validate', () => {
    it('exposes blockType "dropdownBlockAddon"', () => {
        assert.equal(DropdownBlockAddon.blockType, 'dropdownBlockAddon');
    });

    it('rejects all three required fields when missing', async () => {
        const v = new FakeValidator();
        await DropdownBlockAddon.validate(v, { options: {} });
        assert.include(v.errors, 'Option name is empty');
        assert.include(v.errors, 'Option value is empty');
        assert.include(v.errors, 'Field is empty');
    });

    it('passes for fully populated options', async () => {
        const v = new FakeValidator();
        await DropdownBlockAddon.validate(v, {
            options: { optionName: 'name', optionValue: 'value', field: 'f.id' }
        });
        assert.deepEqual(v.errors, []);
    });
});
