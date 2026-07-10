import { assert } from 'chai';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/block-validators/blocks/request-vc-document-block.js';

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

describe('RequestVcDocumentBlock.validate', () => {
    it('exposes blockType "requestVcDocumentBlock"', () => {
        assert.equal(RequestVcDocumentBlock.blockType, 'requestVcDocumentBlock');
    });

    it('rejects missing required schema', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlock.validate(v, { options: {} });
        assert.include(v.errors, 'Option "schema" is not set');
    });

    it('passes when schema is known and presetSchema is omitted', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await RequestVcDocumentBlock.validate(v, { options: { schema: '#A' } });
        assert.deepEqual(v.errors, []);
    });

    it('reports unknown presetSchema even when not required', async () => {
        const v = new FakeValidator({ schemas: new Set(['#A']) });
        await RequestVcDocumentBlock.validate(v, { options: { schema: '#A', presetSchema: '#Bad' } });
        assert.include(v.errors, 'Schema "#Bad" not exist');
    });
});
