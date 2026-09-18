import assert from 'node:assert/strict';
import { DocumentSignature } from '../dist/type/document-signature.type.js';

describe('DocumentSignature numeric enum', () => {
    it('uses default numeric ordering 0..2', () => {
        assert.equal(DocumentSignature.NEW, 0);
        assert.equal(DocumentSignature.VERIFIED, 1);
        assert.equal(DocumentSignature.INVALID, 2);
    });

    it('supports reverse-lookup (numeric enum)', () => {
        assert.equal(DocumentSignature[0], 'NEW');
        assert.equal(DocumentSignature[1], 'VERIFIED');
        assert.equal(DocumentSignature[2], 'INVALID');
    });
});
