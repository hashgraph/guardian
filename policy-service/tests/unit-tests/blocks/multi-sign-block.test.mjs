import { assert } from 'chai';
import { MultiSignBlock } from '../../../dist/policy-engine/block-validators/blocks/multi-sign-block.js';

class FakeValidator {
    constructor() {
        this.errors = [];
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (threshold) => ({ options: { threshold }, children: [] });

describe('MultiSignBlock.validate', () => {
    it('rejects missing threshold', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, refWith(undefined));
        assert.include(v.errors, 'Option "threshold" is not set');
    });

    it('rejects threshold below 0', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, refWith('-5'));
        assert.include(v.errors, '"threshold" value must be between 0 and 100');
    });

    it('rejects threshold above 100', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, refWith('150'));
        assert.include(v.errors, '"threshold" value must be between 0 and 100');
    });

    it('accepts integer threshold within range', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, refWith('50'));
        assert.deepEqual(v.errors, []);
    });

    it('accepts numeric threshold passed as a number', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, refWith(75));
        assert.deepEqual(v.errors, []);
    });

    it("accepts string boundary values '0' and '100'", async () => {
        const a = new FakeValidator();
        await MultiSignBlock.validate(a, refWith('0'));
        assert.deepEqual(a.errors, []);

        const b = new FakeValidator();
        await MultiSignBlock.validate(b, refWith('100'));
        assert.deepEqual(b.errors, []);
    });

    it('treats numeric 0 as missing (current "is not set" path)', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, refWith(0));
        assert.include(v.errors, 'Option "threshold" is not set');
    });
});
