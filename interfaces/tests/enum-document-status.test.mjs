import assert from 'node:assert/strict';
import { DocumentStatus } from '../dist/type/document-status.type.js';

describe('DocumentStatus enum', () => {
    it('covers NEW / ISSUE / REVOKE / SUSPEND / RESUME / FAILED', () => {
        const values = Object.values(DocumentStatus);
        for (const expected of ['NEW', 'ISSUE', 'REVOKE', 'SUSPEND', 'RESUME', 'FAILED']) {
            assert.ok(values.includes(expected), `missing ${expected}`);
        }
    });
});
