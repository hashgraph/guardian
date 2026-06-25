import { assert } from 'chai';
import { TransformationButtonBlock } from '../../../dist/policy-engine/block-validators/blocks/transformation-button-block.js';
import { GroupManagerBlock } from '../../../dist/policy-engine/block-validators/blocks/group-manager.js';
import { MessagesReportBlock } from '../../../dist/policy-engine/block-validators/blocks/messages-report-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

describe('TransformationButtonBlock.validate', () => {
    it('rejects missing url', async () => {
        const v = new FakeValidator();
        await TransformationButtonBlock.validate(v, { options: {}, children: [] });
        assert.include(v.errors, 'Option "url" is not set');
    });

    it('rejects malformed url', async () => {
        const v = new FakeValidator();
        await TransformationButtonBlock.validate(v, {
            options: { url: 'not a url' },
            children: [],
        });
        assert.include(v.errors, '"Url" is not valid');
    });

    it('accepts a valid http(s) URL', async () => {
        for (const url of ['https://example.com', 'http://x.example/path?q=1']) {
            const v = new FakeValidator();
            await TransformationButtonBlock.validate(v, { options: { url }, children: [] });
            assert.deepEqual(v.errors, [], `url=${url} unexpectedly failed`);
        }
    });

    it('accepts non-http URLs that the WHATWG URL parser still considers valid (e.g. data:)', async () => {
        const v = new FakeValidator();
        await TransformationButtonBlock.validate(v, {
            options: { url: 'data:text/plain;base64,aGVsbG8=' },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });
});

describe('GroupManagerBlock.validate', () => {
    it('passes with empty options (CommonBlock-only delegation)', async () => {
        const v = new FakeValidator();
        await GroupManagerBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});

describe('MessagesReportBlock.validate (re-cover for parity)', () => {
    it('passes with empty options', async () => {
        const v = new FakeValidator();
        await MessagesReportBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});
