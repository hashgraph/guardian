import assert from 'node:assert/strict';
import { DocumentType } from '../dist/type/document.type.js';

describe('DocumentType enum', () => {
    it('exposes VC and VP', () => {
        assert.equal(DocumentType.VC, 'VC');
        assert.equal(DocumentType.VP, 'VP');
    });
});
