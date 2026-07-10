import { assert } from 'chai';
import { ExternalDataBlock } from '../../../dist/policy-engine/block-validators/blocks/external-data-block.js';
import { ExternalTopicBlock } from '../../../dist/policy-engine/block-validators/blocks/external-topic-block.js';

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

describe('ExternalDataBlock.validate', () => {
    it('passes a config without schema (schema is optional)', async () => {
        const v = new FakeValidator();
        await ExternalDataBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
        assert.deepEqual(v.checked, []);
    });

    it('passes when schema is provided', async () => {
        const v = new FakeValidator();
        await ExternalDataBlock.validate(v, { options: { schema: 's-1' }, children: [] });
        assert.deepEqual(v.errors, []);
    });
});

describe('ExternalTopicBlock.validate', () => {
    it('passes a config without schema (schema optional)', async () => {
        const v = new FakeValidator();
        await ExternalTopicBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('passes with schema set', async () => {
        const v = new FakeValidator();
        await ExternalTopicBlock.validate(v, { options: { schema: 's-1' }, children: [] });
        assert.deepEqual(v.errors, []);
    });
});
