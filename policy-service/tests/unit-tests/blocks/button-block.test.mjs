import { assert } from 'chai';
import { ButtonBlock } from '../../../dist/policy-engine/block-validators/blocks/button-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (uiMetaData) => ({ options: { uiMetaData }, children: [] });

describe('ButtonBlock.validate', () => {
    it('rejects when uiMetaData is missing', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, refWith(undefined));
        assert.include(v.errors, 'Option "uiMetaData" is not set');
    });

    it('rejects when uiMetaData.buttons is not an array', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, refWith({ buttons: 'oops' }));
        assert.include(v.errors, 'Option "uiMetaData.buttons" must be an array');
    });

    it('rejects missing tag', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, refWith({
            buttons: [{ type: 'selector', filters: [] }],
        }));
        assert.include(v.errors, 'Option "tag" is not set');
    });

    it('rejects unknown button type', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, refWith({
            buttons: [{ tag: 't', type: 'mystery', filters: [] }],
        }));
        assert.include(v.errors, 'Option "type" must be a "selector|selector-dialog"');
    });

    it('rejects missing button.filters array', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, refWith({
            buttons: [{ tag: 't', type: 'selector' }],
        }));
        assert.include(v.errors, 'Option "button.filters" must be an array');
    });

    it('rejects filter without type or field', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, refWith({
            buttons: [{ tag: 't', type: 'selector', filters: [{}] }],
        }));
        assert.include(v.errors, 'Option "type" is not set');
        assert.include(v.errors, 'Option "field" is not set');
    });

    it('selector-dialog requires title and description', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, refWith({
            buttons: [{ tag: 't', type: 'selector-dialog', filters: [] }],
        }));
        assert.include(v.errors, 'Option "title" is not set');
        assert.include(v.errors, 'Option "description" is not set');
    });

    it('accepts a fully valid selector button', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, refWith({
            buttons: [{
                tag: 't', type: 'selector',
                filters: [{ type: 'equal', field: 'status' }],
            }],
        }));
        assert.deepEqual(v.errors, []);
    });
});
