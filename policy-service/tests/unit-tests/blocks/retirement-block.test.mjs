import { assert } from 'chai';
import { RetirementBlock } from '../../../dist/policy-engine/block-validators/blocks/retirement-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    tokenTemplateNotExist() { return false; }
    async tokenNotExist() { return false; }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const baseRef = (overrides = {}) => ({
    options: {
        tokenId: '0.0.1',
        accountType: 'default',
        ...overrides,
    },
    children: [],
});

describe('RetirementBlock.validate — tokenId / accountType', () => {
    it('passes a minimal valid config', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef());
        assert.deepEqual(v.errors, []);
    });

    it('rejects missing tokenId', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ tokenId: undefined }));
        assert.include(v.errors, 'Option "tokenId" is not set');
    });

    it('rejects unknown accountType (only default and custom permitted)', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ accountType: 'custom-value' }));
        assert.include(v.errors, 'Option "accountType" must be one of default,custom');
    });

    it('rejects custom accountType without accountId', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ accountType: 'custom' }));
        assert.include(v.errors, 'Option "accountId" is not set');
    });
});

describe('RetirementBlock.validate — serialNumbersExpression', () => {
    it('accepts a simple integer', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ serialNumbersExpression: '7' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts a numeric range', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ serialNumbersExpression: '1-10' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts comma-separated mixed tokens', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ serialNumbersExpression: '1, 2-5, fieldA' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects illegal characters', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ serialNumbersExpression: '1+2' }));
        assert.match(v.errors[0], /Invalid serial number "1\+2"/);
    });

    it('rejects zero or negative integer', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ serialNumbersExpression: '0' }));
        assert.match(v.errors[0], /must be greater than or equal to 1/);
    });

    it('rejects dangling dash range', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ serialNumbersExpression: '5-' }));
        assert.match(v.errors[0], /both start and end are required/);
    });

    it('rejects multi-dash token', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ serialNumbersExpression: '1-2-3' }));
        assert.match(v.errors[0], /only one '-' is allowed/);
    });

    it('rejects descending or equal numeric range', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ serialNumbersExpression: '5-3' }));
        assert.match(v.errors[0], /End serial number must be greater than start/);
    });

    it('rejects non-string expression type', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ serialNumbersExpression: 12345 }));
        assert.include(v.errors, 'Option "serial numbers" must be a string');
    });
});

describe('RetirementBlock.validate — rule', () => {
    it('accepts string rule', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ rule: 'r1' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects non-string rule when present', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, baseRef({ rule: 99 }));
        assert.include(v.errors, 'Option "rule" must be a string');
    });
});
