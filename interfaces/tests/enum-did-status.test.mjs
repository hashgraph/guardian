import assert from 'node:assert/strict';
import { DidDocumentStatus } from '../dist/type/did-status.type.js';

describe('DidDocumentStatus enum', () => {
    it('covers NEW / CREATE / UPDATE / DELETE / FAILED', () => {
        const values = Object.values(DidDocumentStatus);
        for (const expected of ['NEW', 'CREATE', 'UPDATE', 'DELETE', 'FAILED']) {
            assert.ok(values.includes(expected), `missing ${expected}`);
        }
    });
    it('keys equal values', () => {
        for (const [k, v] of Object.entries(DidDocumentStatus)) assert.equal(k, v);
    });
});
