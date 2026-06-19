import assert from 'node:assert/strict';
import { MultipartOptions } from '../../../dist/helpers/interceptors/types/multipart.js';

describe('MultipartOptions', () => {
    it('assigns all four constructor arguments', () => {
        const re = /png/;
        const opts = new MultipartOptions(1024, re, ['a', 'b'], ['a']);
        assert.equal(opts.maxFileSize, 1024);
        assert.equal(opts.fileType, re);
        assert.deepEqual(opts.allowedFields, ['a', 'b']);
        assert.deepEqual(opts.requiredFields, ['a']);
    });

    it('accepts a string fileType', () => {
        const opts = new MultipartOptions(50, 'image/png');
        assert.equal(opts.fileType, 'image/png');
        assert.equal(opts.allowedFields, undefined);
        assert.equal(opts.requiredFields, undefined);
    });

    it('leaves every field undefined when constructed with no arguments', () => {
        const opts = new MultipartOptions();
        assert.equal(opts.maxFileSize, undefined);
        assert.equal(opts.fileType, undefined);
        assert.equal(opts.allowedFields, undefined);
        assert.equal(opts.requiredFields, undefined);
    });
});
