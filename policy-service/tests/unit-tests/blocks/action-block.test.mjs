import { assert } from 'chai';
import { InterfaceDocumentActionBlock } from '../../../dist/policy-engine/block-validators/blocks/action-block.js';

class FakeValidator {
    constructor() {
        this.errors = [];
        this.checked = [];
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    validateSchemaVariable(name, value, required) {
        if (required && !value) return `${name} is required`;
        return null;
    }
    checkBlockError(error) { if (error) this.checked.push(error); }
}

const refWith = (overrides = {}) => ({ options: { ...overrides }, children: [] });

describe('InterfaceDocumentActionBlock.validate', () => {
    it('rejects missing type', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, refWith({}));
        assert.include(v.errors, 'Option "type" is not set');
    });

    it('rejects unknown type', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, refWith({ type: 'mystery' }));
        assert.include(v.errors, 'Option "type" must be a "selector|download|dropdown"');
    });

    describe('type=selector', () => {
        it('rejects missing uiMetaData', async () => {
            const v = new FakeValidator();
            await InterfaceDocumentActionBlock.validate(v, refWith({ type: 'selector' }));
            assert.include(v.errors, 'Option "uiMetaData" is not set');
        });

        it('rejects missing field', async () => {
            const v = new FakeValidator();
            await InterfaceDocumentActionBlock.validate(v, refWith({
                type: 'selector',
                uiMetaData: { options: [{ tag: 't1' }] },
            }));
            assert.include(v.errors, 'Option "field" is not set');
        });

        it('rejects when uiMetaData.options is not an array', async () => {
            const v = new FakeValidator();
            await InterfaceDocumentActionBlock.validate(v, refWith({
                type: 'selector',
                field: 'f',
                uiMetaData: { options: 'oops' },
            }));
            assert.include(v.errors, 'Option "uiMetaData.options" must be an array');
        });

        it('rejects duplicate option tags', async () => {
            const v = new FakeValidator();
            await InterfaceDocumentActionBlock.validate(v, refWith({
                type: 'selector',
                field: 'f',
                uiMetaData: { options: [{ tag: 't1' }, { tag: 't1' }] },
            }));
            assert.include(v.errors, 'Option Tag t1 already exist');
        });

        it('accepts a valid selector config', async () => {
            const v = new FakeValidator();
            await InterfaceDocumentActionBlock.validate(v, refWith({
                type: 'selector',
                field: 'f',
                uiMetaData: { options: [{ tag: 't1' }, { tag: 't2' }] },
            }));
            assert.deepEqual(v.errors, []);
        });
    });

    describe('type=download', () => {
        it('rejects missing targetUrl', async () => {
            const v = new FakeValidator();
            await InterfaceDocumentActionBlock.validate(v, refWith({
                type: 'download',
                schema: 'schema-1',
            }));
            assert.include(v.errors, 'Option "targetUrl" is not set');
        });

        it('uses checkBlockError for required schema', async () => {
            const v = new FakeValidator();
            await InterfaceDocumentActionBlock.validate(v, refWith({
                type: 'download',
                targetUrl: 'https://x',
                // no schema → validateSchemaVariable returns required error
            }));
            assert.include(v.checked, 'schema is required');
        });
    });

    describe('type=dropdown', () => {
        it('rejects missing name', async () => {
            const v = new FakeValidator();
            await InterfaceDocumentActionBlock.validate(v, refWith({ type: 'dropdown' }));
            assert.include(v.errors, 'Option "name" is not set');
        });

        it('rejects missing value', async () => {
            const v = new FakeValidator();
            await InterfaceDocumentActionBlock.validate(v, refWith({ type: 'dropdown', name: 'n' }));
            assert.include(v.errors, 'Option "value" is not set');
        });

        it('accepts a complete dropdown config', async () => {
            const v = new FakeValidator();
            await InterfaceDocumentActionBlock.validate(v, refWith({
                type: 'dropdown', name: 'n', value: 'v',
            }));
            assert.deepEqual(v.errors, []);
        });
    });

    it('type=transformation passes without further checks', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, refWith({ type: 'transformation' }));
        assert.deepEqual(v.errors, []);
    });
});
