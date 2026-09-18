import assert from 'node:assert/strict';
import { SignatureType } from '../dist/type/signature.type.js';

describe('SignatureType enum', () => {
    it('exposes Ed25519Signature2018 and BbsBlsSignature2020 W3C suite ids', () => {
        assert.equal(SignatureType.Ed25519Signature2018, 'Ed25519Signature2018');
        assert.equal(SignatureType.BbsBlsSignature2020, 'BbsBlsSignature2020');
    });
});
