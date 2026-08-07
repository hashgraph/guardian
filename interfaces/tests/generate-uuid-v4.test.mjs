import assert from 'node:assert/strict';
import { GenerateUUIDv4, GenerateID } from '../dist/helpers/generate-uuid-v4.js';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('GenerateUUIDv4', () => {
    it('produces a valid v4 UUID', () => {
        const id = GenerateUUIDv4();
        assert.match(id, UUID_V4_RE);
    });

    it('produces a different value across calls (statistical test)', () => {
        const a = GenerateUUIDv4();
        const b = GenerateUUIDv4();
        assert.notEqual(a, b);
    });
});

describe('GenerateID', () => {
    it('returns a 32-character hex string', () => {
        const id = GenerateID();
        assert.match(id, /^[0-9a-f]{32}$/);
    });

    it('produces a different value across calls', () => {
        assert.notEqual(GenerateID(), GenerateID());
    });
});
