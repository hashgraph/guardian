import { assert } from 'chai';
import { ButtonBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/button-block-addon.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

describe('ButtonBlockAddon.validate', () => {
    it('exposes blockType "buttonBlockAddon"', () => {
        assert.equal(ButtonBlockAddon.blockType, 'buttonBlockAddon');
    });

    it('rejects missing button name', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, { options: {} });
        assert.include(v.errors, 'Button name is empty');
    });

    it('rejects dialog config when title and result-path are missing', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, { options: { name: 'btn', dialog: true } });
        assert.include(v.errors, 'Dialog title is empty');
        assert.include(v.errors, 'Dialog result field path is empty');
    });

    it('passes for a non-dialog button', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, { options: { name: 'Send' } });
        assert.deepEqual(v.errors, []);
    });

    it('passes for a fully populated dialog button', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, {
            options: {
                name: 'Send',
                dialog: true,
                dialogOptions: { dialogTitle: 'OK?', dialogResultFieldPath: 'result.confirmed' }
            }
        });
        assert.deepEqual(v.errors, []);
    });
});
