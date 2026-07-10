import { assert } from 'chai';
import { GlobalEventsReaderBlock } from '../../../dist/policy-engine/block-validators/blocks/global-events-reader-block.js';
import { GlobalEventsWriterBlock } from '../../../dist/policy-engine/block-validators/blocks/global-events-writer-block.js';

class FakeValidator {
    constructor() {
        this.errors = [];
        this.checked = [];
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    validateSchemaVariable() { return null; }
    checkBlockError(error) { if (error) this.checked.push(error); }
}

describe('GlobalEventsReaderBlock.validate', () => {
    it('passes a minimal config with no eventTopics or branches', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('rejects non-array eventTopics', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, {
            options: { eventTopics: 'oops' },
            children: [],
        });
        assert.include(v.errors, 'Option "eventTopics" must be an array');
    });

    it('rejects entries with empty/whitespace topicId', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, {
            options: { eventTopics: [{ topicId: '' }, { topicId: '   ' }] },
            children: [],
        });
        assert.equal(v.errors.length, 2);
        assert.match(v.errors[0], /eventTopics\[0\]\.topicId/);
        assert.match(v.errors[1], /eventTopics\[1\]\.topicId/);
    });

    it('rejects non-array branches', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, {
            options: { branches: 'nope' },
            children: [],
        });
        assert.include(v.errors, 'Option "branches" must be an array');
    });

    it('flags missing branchEvent on branch entries', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, {
            options: { branches: [{ documentType: 'vc' }] },
            children: [],
        });
        assert.match(v.errors[0], /branches\[0\]\.branchEvent/);
    });

    it('flags an unsupported documentType', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, {
            options: { branches: [{ branchEvent: 'e1', documentType: 'pdf' }] },
            children: [],
        });
        assert.match(v.errors[0], /branches\[0\]\.documentType/);
    });

    it('accepts an allowed documentType', async () => {
        const v = new FakeValidator();
        await GlobalEventsReaderBlock.validate(v, {
            options: { branches: [{ branchEvent: 'e1', documentType: 'csv' }] },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });

    it('runs schema validation when branch.schema is present', async () => {
        const v = new FakeValidator();
        v.validateSchemaVariable = () => 'schema invalid';
        await GlobalEventsReaderBlock.validate(v, {
            options: { branches: [{ branchEvent: 'e1', documentType: 'vc', schema: 's-1' }] },
            children: [],
        });
        assert.include(v.checked, 'schema invalid');
    });
});

describe('GlobalEventsWriterBlock.validate', () => {
    it('rejects when topicIds is not an array', async () => {
        const v = new FakeValidator();
        await GlobalEventsWriterBlock.validate(v, { options: {}, children: [] });
        assert.include(v.errors, 'Option "topicIds" must be an array');
    });

    it('flags missing topicId per entry', async () => {
        const v = new FakeValidator();
        await GlobalEventsWriterBlock.validate(v, {
            options: { topicIds: [{ topicId: '', documentType: 'vc' }] },
            children: [],
        });
        assert.include(v.errors, 'Option "topicId" is not set');
    });

    it('flags missing documentType', async () => {
        const v = new FakeValidator();
        await GlobalEventsWriterBlock.validate(v, {
            options: { topicIds: [{ topicId: 't1' }] },
            children: [],
        });
        assert.include(v.errors, 'Option "documentType" is not set');
    });

    it('flags an unsupported documentType', async () => {
        const v = new FakeValidator();
        await GlobalEventsWriterBlock.validate(v, {
            options: { topicIds: [{ topicId: 't1', documentType: 'pdf' }] },
            children: [],
        });
        assert.include(
            v.errors,
            'Option "documentType" must be one of: vc, json, csv, text, any',
        );
    });

    it('accepts a fully valid topicIds entry', async () => {
        const v = new FakeValidator();
        await GlobalEventsWriterBlock.validate(v, {
            options: { topicIds: [{ topicId: 't1', documentType: 'json' }] },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });
});
