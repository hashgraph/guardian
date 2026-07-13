import assert from 'node:assert/strict';
import { getFileFromPart } from '../dist/helpers/interceptors/utils/multipart.js';

const fakePart = (overrides = {}) => ({
    filename: 'doc.pdf',
    mimetype: 'application/pdf',
    fieldname: 'document',
    encoding: '7bit',
    toBuffer: async () => Buffer.from('hello'),
    ...overrides,
});

describe('getFileFromPart', () => {
    it('returns the canonical MultipartFile shape for a complete part', async () => {
        const part = fakePart();
        const out = await getFileFromPart(part);
        assert.deepEqual(out, {
            buffer: Buffer.from('hello'),
            size: 5,
            filename: 'doc.pdf',
            mimetype: 'application/pdf',
            fieldname: 'document',
            encoding: '7bit',
            originalname: 'document',
        });
    });

    it('exposes byteLength of buffer as size', async () => {
        const part = fakePart({ toBuffer: async () => Buffer.alloc(1024) });
        const out = await getFileFromPart(part);
        assert.equal(out.size, 1024);
    });

    it('mirrors fieldname into originalname', async () => {
        const part = fakePart({ fieldname: 'avatar' });
        const out = await getFileFromPart(part);
        assert.equal(out.originalname, 'avatar');
        assert.equal(out.fieldname, 'avatar');
    });

    it('returns null when the buffer is empty (size=0)', async () => {
        const part = fakePart({ toBuffer: async () => Buffer.alloc(0) });
        const out = await getFileFromPart(part);
        assert.equal(out, null);
    });

    it('returns null when fieldname is missing', async () => {
        const part = fakePart({ fieldname: undefined });
        const out = await getFileFromPart(part);
        assert.equal(out, null);
    });

    it('returns null when fieldname is an empty string', async () => {
        const part = fakePart({ fieldname: '' });
        const out = await getFileFromPart(part);
        assert.equal(out, null);
    });

    it('preserves binary data byte-for-byte', async () => {
        const bytes = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0xff]);
        const out = await getFileFromPart(fakePart({ toBuffer: async () => bytes }));
        assert.deepEqual(Array.from(out.buffer), Array.from(bytes));
    });
});
