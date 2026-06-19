import { assert } from 'chai';
import { RetirementBlock } from '../../../dist/policy-engine/block-validators/blocks/retirement-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._templateMissing = !!opts.templateMissing;
        this._tokenMissing = !!opts.tokenMissing;
    }
    addError(msg) { this.errors.push(msg); }
    tokenTemplateNotExist() { return this._templateMissing; }
    async tokenNotExist() { return this._tokenMissing; }
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

const errorsFor = async (overrides = {}, opts = {}) => {
    const v = new FakeValidator(opts);
    await RetirementBlock.validate(v, baseRef(overrides));
    return v.errors;
};

describe('RetirementBlock.validate - token resolution', () => {
    it('exposes the retirementDocumentBlock block type', () => {
        assert.equal(RetirementBlock.blockType, 'retirementDocumentBlock');
    });

    it('passes a minimal tokenId-based config', async () => {
        assert.deepEqual(await errorsFor(), []);
    });

    it('rejects missing tokenId when not using a template', async () => {
        assert.include(await errorsFor({ tokenId: undefined }), 'Option "tokenId" is not set');
    });

    it('rejects non-string tokenId', async () => {
        assert.include(await errorsFor({ tokenId: 123 }), 'Option "tokenId" must be a string');
    });

    it('rejects unknown tokenId from registry', async () => {
        assert.include(await errorsFor({ tokenId: '0.0.999' }, { tokenMissing: true }), 'Token with id 0.0.999 does not exist');
    });

    it('rejects missing template when useTemplate=true', async () => {
        assert.include(await errorsFor({ useTemplate: true, tokenId: undefined }), 'Option "template" is not set');
    });

    it('rejects unknown template when useTemplate=true', async () => {
        assert.include(
            await errorsFor({ useTemplate: true, template: 't1', tokenId: undefined }, { templateMissing: true }),
            'Token "t1" does not exist'
        );
    });

    it('passes a valid template config', async () => {
        assert.deepEqual(await errorsFor({ useTemplate: true, template: 't1', tokenId: undefined }), []);
    });
});

describe('RetirementBlock.validate - account type and rule', () => {
    it('rejects unknown accountType', async () => {
        assert.include(await errorsFor({ accountType: 'weird' }), 'Option "accountType" must be one of default,custom');
    });

    it('accepts custom accountType with accountId', async () => {
        assert.deepEqual(await errorsFor({ accountType: 'custom', accountId: '0.0.5' }), []);
    });

    it('rejects custom accountType without accountId', async () => {
        assert.include(await errorsFor({ accountType: 'custom' }), 'Option "accountId" is not set');
    });

    it('rejects non-string rule', async () => {
        assert.include(await errorsFor({ rule: 42 }), 'Option "rule" must be a string');
    });

    it('accepts a string rule', async () => {
        assert.deepEqual(await errorsFor({ rule: 'someRule' }), []);
    });

    it('rejects non-string serialNumbersExpression', async () => {
        assert.include(await errorsFor({ serialNumbersExpression: 5 }), 'Option "serial numbers" must be a string');
    });
});

describe('RetirementBlock.validate - serial number expressions', () => {
    it('accepts a single integer serial', async () => {
        assert.deepEqual(await errorsFor({ serialNumbersExpression: '1' }), []);
    });

    it('accepts a list of integer serials', async () => {
        assert.deepEqual(await errorsFor({ serialNumbersExpression: '1,2,3' }), []);
    });

    it('accepts a field reference token', async () => {
        assert.deepEqual(await errorsFor({ serialNumbersExpression: 'field0' }), []);
    });

    it('accepts an integer range', async () => {
        assert.deepEqual(await errorsFor({ serialNumbersExpression: '1-3' }), []);
    });

    it('accepts a field-based range', async () => {
        assert.deepEqual(await errorsFor({ serialNumbersExpression: 'field0-field1' }), []);
    });

    it('trims whitespace around tokens', async () => {
        assert.deepEqual(await errorsFor({ serialNumbersExpression: ' 1 , 2 ' }), []);
    });

    it('ignores empty tokens between commas', async () => {
        assert.deepEqual(await errorsFor({ serialNumbersExpression: '1,,2' }), []);
    });

    it('rejects an illegal character in a token', async () => {
        const errors = await errorsFor({ serialNumbersExpression: '1@2' });
        assert.isTrue(errors.some(e => /character "@" is not allowed/.test(e)));
    });

    it('rejects a space-containing illegal character mid-token', async () => {
        const errors = await errorsFor({ serialNumbersExpression: 'a b' });
        assert.isTrue(errors.some(e => /is not allowed/.test(e)));
    });

    it('rejects an integer below 1', async () => {
        const errors = await errorsFor({ serialNumbersExpression: '0' });
        assert.isTrue(errors.some(e => /must be greater than or equal to 1/.test(e)));
    });

    it('rejects a leading-dash range', async () => {
        const errors = await errorsFor({ serialNumbersExpression: '-3' });
        assert.isTrue(errors.some(e => /both start and end are required/.test(e)));
    });

    it('rejects a trailing-dash range', async () => {
        const errors = await errorsFor({ serialNumbersExpression: '3-' });
        assert.isTrue(errors.some(e => /both start and end are required/.test(e)));
    });

    it('rejects a range with multiple dashes', async () => {
        const errors = await errorsFor({ serialNumbersExpression: '1-2-3' });
        assert.isTrue(errors.some(e => /only one '-' is allowed/.test(e)));
    });

    it('rejects a numeric range where end <= start', async () => {
        const errors = await errorsFor({ serialNumbersExpression: '5-3' });
        assert.isTrue(errors.some(e => /End serial number must be greater than start/.test(e)));
    });

    it('rejects a numeric range where end == start', async () => {
        const errors = await errorsFor({ serialNumbersExpression: '4-4' });
        assert.isTrue(errors.some(e => /End serial number must be greater than start/.test(e)));
    });

    it('reports each invalid token in a list', async () => {
        const errors = await errorsFor({ serialNumbersExpression: '0,-3' });
        assert.isTrue(errors.some(e => /must be greater than or equal to 1/.test(e)));
        assert.isTrue(errors.some(e => /both start and end are required/.test(e)));
    });

    it('does not error for valid mixed list', async () => {
        assert.deepEqual(await errorsFor({ serialNumbersExpression: '1, 2-5, field0, field1-field2' }), []);
    });
});
