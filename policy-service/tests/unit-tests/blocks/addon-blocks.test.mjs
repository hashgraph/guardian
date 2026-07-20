import { assert } from 'chai';
// impact-addon hits a circular-import init order issue when loaded standalone;
// covered indirectly by other tests. Keep this file focused on the simple
// CommonBlock-only delegators below.
import { HistoryAddon } from '../../../dist/policy-engine/block-validators/blocks/history-addon.js';
import { PaginationAddon } from '../../../dist/policy-engine/block-validators/blocks/pagination-addon.js';
import { ReassigningBlock } from '../../../dist/policy-engine/block-validators/blocks/reassigning.block.js';
import { PolicyRolesBlock } from '../../../dist/policy-engine/block-validators/blocks/policy-roles.js';

class FakeValidator {
    constructor() {
        this.errors = [];
        this.checked = [];
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    checkBlockError(error) { if (error) this.checked.push(error); }
}

describe('HistoryAddon.validate', () => {
    it('passes with empty options (delegates to CommonBlock)', async () => {
        const v = new FakeValidator();
        await HistoryAddon.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});

describe('PaginationAddon.validate', () => {
    it('passes with empty options', async () => {
        const v = new FakeValidator();
        await PaginationAddon.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});

describe('ReassigningBlock.validate', () => {
    it('passes with empty options', async () => {
        const v = new FakeValidator();
        await ReassigningBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});

describe('PolicyRolesBlock.validate', () => {
    it('passes with empty options', async () => {
        const v = new FakeValidator();
        await PolicyRolesBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});
