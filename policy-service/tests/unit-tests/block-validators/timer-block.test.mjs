import { expect } from 'chai';
import { TimerBlock } from '../../../dist/policy-engine/block-validators/blocks/timer-block.js';

function makeValidatorStub() {
    const errors = [];
    return {
        errors,
        addError(msg) { errors.push(msg); },
        async getArtifact() { return null; },
        getErrorMessage(e) { return typeof e === 'string' ? e : (e && e.message) || 'unknown'; },
    };
}

function makeRef(options = {}) {
    return { blockType: 'timerBlock', options, children: [] };
}

describe('@unit timerBlock validator', () => {
    it('flags missing startDate', async () => {
        const v = makeValidatorStub();
        await TimerBlock.validate(v, makeRef({ period: '1d' }));
        expect(v.errors).to.include('Option "startDate" is not set');
    });

    it('flags non-string startDate', async () => {
        const v = makeValidatorStub();
        await TimerBlock.validate(v, makeRef({ startDate: 12345, period: '1d' }));
        expect(v.errors).to.include('Option "startDate" must be a string');
    });

    it('flags missing period', async () => {
        const v = makeValidatorStub();
        await TimerBlock.validate(v, makeRef({ startDate: '2026-01-01' }));
        expect(v.errors).to.include('Option "period" is not set');
    });

    it('flags non-string period', async () => {
        const v = makeValidatorStub();
        await TimerBlock.validate(v, makeRef({ startDate: '2026-01-01', period: 86400 }));
        expect(v.errors).to.include('Option "period" must be a string');
    });

    it('accepts well-formed options without recording errors', async () => {
        const v = makeValidatorStub();
        await TimerBlock.validate(v, makeRef({ startDate: '2026-01-01', period: '1d' }));
        expect(v.errors).to.deep.equal([]);
    });

    it('reports both missing options together (not just the first)', async () => {
        const v = makeValidatorStub();
        await TimerBlock.validate(v, makeRef({}));
        expect(v.errors).to.include('Option "startDate" is not set');
        expect(v.errors).to.include('Option "period" is not set');
    });

    it('flags missing artifact via CommonBlock', async () => {
        const v = makeValidatorStub();
        await TimerBlock.validate(v, makeRef({
            startDate: '2026-01-01',
            period: '1d',
            artifacts: [{ uuid: 'a-1' }],
        }));
        expect(v.errors.some((e) => e.includes('a-1'))).to.equal(true);
    });

    it('catches unhandled exceptions and records them as errors', async () => {
        const v = {
            errors: [],
            addError(m) { this.errors.push(m); },
            async getArtifact() { throw new Error('boom'); },
            getErrorMessage(e) { return e && e.message; },
        };
        await TimerBlock.validate(v, makeRef({
            startDate: '2026-01-01',
            period: '1d',
            artifacts: [{ uuid: 'a-1' }],
        }));
        expect(v.errors.some((e) => e.includes('Unhandled exception') && e.includes('boom'))).to.equal(true);
    });
});
