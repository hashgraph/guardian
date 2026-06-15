import { assert } from 'chai';
import { ExternalTopicBlock } from '../../../dist/policy-engine/block-validators/blocks/external-topic-block.js';

class FakeValidator {
    constructor({ knownSchemas = new Set() } = {}) {
        this.errors = [];
        this.knownSchemas = knownSchemas;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    validateSchemaVariable(name, value, required) {
        if (required && !value) return `Option "${name}" is not set`;
        if (value && !this.knownSchemas.has(value)) return `Schema "${value}" not exist`;
        return null;
    }
    checkBlockError(err) {
        if (err) this.errors.push(err);
    }
}

describe('ExternalTopicBlock.validate', () => {
    it('exposes blockType "externalTopicBlock"', () => {
        assert.equal(ExternalTopicBlock.blockType, 'externalTopicBlock');
    });

    it('passes when no schema configured (schema is optional)', async () => {
        const v = new FakeValidator();
        await ExternalTopicBlock.validate(v, { options: {} });
        assert.deepEqual(v.errors, []);
    });

    it('reports unknown schema via checkBlockError', async () => {
        const v = new FakeValidator({ knownSchemas: new Set(['#A']) });
        await ExternalTopicBlock.validate(v, { options: { schema: '#Missing' } });
        assert.include(v.errors, 'Schema "#Missing" not exist');
    });

    it('passes for a known schema', async () => {
        const v = new FakeValidator({ knownSchemas: new Set(['#A']) });
        await ExternalTopicBlock.validate(v, { options: { schema: '#A' } });
        assert.deepEqual(v.errors, []);
    });
});
