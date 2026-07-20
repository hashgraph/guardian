import { assert } from 'chai';
import { RequestVcDocumentBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/request-vc-document-block-addon.js';

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

describe('RequestVcDocumentBlockAddon.validate', () => {
    it('exposes blockType "requestVcDocumentBlockAddon"', () => {
        assert.equal(RequestVcDocumentBlockAddon.blockType, 'requestVcDocumentBlockAddon');
    });

    it('rejects when buttonName and dialogTitle are missing', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await RequestVcDocumentBlockAddon.validate(v, { options: { schema: '#A' } });
        assert.include(v.errors, 'Button name is empty');
        assert.include(v.errors, 'Dialog title is empty');
    });

    it('passes for a fully populated config without preset', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await RequestVcDocumentBlockAddon.validate(v, {
            options: { schema: '#A', buttonName: 'Submit', dialogTitle: 'Submit doc' }
        });
        assert.deepEqual(v.errors, []);
    });

    it('requires presetSchema only when preset is truthy', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await RequestVcDocumentBlockAddon.validate(v, {
            options: { schema: '#A', preset: true, buttonName: 'b', dialogTitle: 'd' }
        });
        assert.include(v.errors, 'Option "presetSchema" is not set');
    });
});
