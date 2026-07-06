import assert from 'node:assert/strict';
import { TagType } from '../dist/type/tag.type.js';

describe('TagType enum (interfaces)', () => {
    it('matches PascalCase resource names', () => {
        for (const k of ['Schema', 'Policy', 'Token', 'Module', 'PolicyDocument', 'Contract', 'Tool', 'PolicyBlock']) {
            assert.equal(TagType[k], k);
        }
    });
});
