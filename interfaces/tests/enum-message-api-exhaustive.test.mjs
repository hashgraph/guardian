import assert from 'node:assert/strict';
import { MessageAPI } from '../dist/type/messages/message-api.type.js';

describe('MessageAPI per-member integrity', () => {
    for (const [key, value] of Object.entries(MessageAPI)) {
        it(`${key} is a non-empty string with a unique value`, () => {
            assert.equal(typeof value, 'string');
            assert.ok(value.length > 0);
            const matches = Object.values(MessageAPI).filter((v) => v === value);
            assert.equal(matches.length, 1);
        });
    }
});
