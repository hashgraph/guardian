import { assert } from 'chai';
import { DropdownBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/dropdown-block-addon.js';
import { ExtractDataBlock } from '../../../dist/policy-engine/block-validators/blocks/extract-data.js';
import { MessagesReportBlock } from '../../../dist/policy-engine/block-validators/blocks/messages-report-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

describe('DropdownBlockAddon.validate', () => {
    it('passes a complete config', async () => {
        const v = new FakeValidator();
        await DropdownBlockAddon.validate(v, {
            options: { optionName: 'name', optionValue: 'val', field: 'f' },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });

    it('rejects missing optionName / optionValue / field', async () => {
        const v = new FakeValidator();
        await DropdownBlockAddon.validate(v, { options: {}, children: [] });
        assert.include(v.errors, 'Option name is empty');
        assert.include(v.errors, 'Option value is empty');
        assert.include(v.errors, 'Field is empty');
    });
});

describe('ExtractDataBlock.validate', () => {
    it('passes with empty options (delegates to CommonBlock)', async () => {
        const v = new FakeValidator();
        await ExtractDataBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});

describe('MessagesReportBlock.validate', () => {
    it('passes with empty options', async () => {
        const v = new FakeValidator();
        await MessagesReportBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});
