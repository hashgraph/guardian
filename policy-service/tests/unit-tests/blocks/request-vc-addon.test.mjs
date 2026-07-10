import { assert } from 'chai';
import { RequestVcDocumentBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/request-vc-document-block-addon.js';

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

const refWith = (overrides = {}) => ({
    options: {
        schema: 's-1',
        buttonName: 'Submit',
        dialogTitle: 'Open',
        ...overrides,
    },
    children: [],
});

describe('RequestVcDocumentBlockAddon.validate', () => {
    it('passes a fully populated config', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, refWith());
        assert.deepEqual(v.errors, []);
        assert.deepEqual(v.checked, []);
    });

    it('flags required schema via checkBlockError when missing', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, refWith({ schema: undefined }));
        assert.include(v.checked, 'schema is required');
    });

    it('flags required presetSchema only when preset=true', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, refWith({ preset: true }));
        assert.include(v.checked, 'presetSchema is required');
    });

    it('does NOT require presetSchema when preset is falsy', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, refWith({ preset: false }));
        assert.notInclude(v.checked, 'presetSchema is required');
    });

    it('rejects missing buttonName', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, refWith({ buttonName: '' }));
        assert.include(v.errors, 'Button name is empty');
    });

    it('rejects missing dialogTitle', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, refWith({ dialogTitle: '' }));
        assert.include(v.errors, 'Dialog title is empty');
    });
});
