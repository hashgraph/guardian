import { assert } from 'chai';
import { TimerBlock } from '../../../dist/policy-engine/block-validators/blocks/timer-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (overrides = {}) => ({
    options: {
        startDate: '2026-01-01T00:00:00Z',
        period: '1d',
        ...overrides,
    },
    children: [],
});

describe('TimerBlock.validate', () => {
    it('passes a valid config', async () => {
        const v = new FakeValidator();
        await TimerBlock.validate(v, refWith());
        assert.deepEqual(v.errors, []);
    });

    it('rejects missing startDate', async () => {
        const v = new FakeValidator();
        await TimerBlock.validate(v, refWith({ startDate: undefined }));
        assert.include(v.errors, 'Option "startDate" is not set');
    });

    it('rejects non-string startDate', async () => {
        const v = new FakeValidator();
        await TimerBlock.validate(v, refWith({ startDate: 12345 }));
        assert.include(v.errors, 'Option "startDate" must be a string');
    });

    it('rejects missing period', async () => {
        const v = new FakeValidator();
        await TimerBlock.validate(v, refWith({ period: undefined }));
        assert.include(v.errors, 'Option "period" is not set');
    });

    it('rejects non-string period', async () => {
        const v = new FakeValidator();
        await TimerBlock.validate(v, refWith({ period: 60 }));
        assert.include(v.errors, 'Option "period" must be a string');
    });
});
