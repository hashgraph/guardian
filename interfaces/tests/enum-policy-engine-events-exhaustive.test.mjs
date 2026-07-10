import assert from 'node:assert/strict';
import { PolicyEngineEvents } from '../dist/type/messages/policy-engine-events.js';

describe('PolicyEngineEvents per-member integrity', () => {
    const values = Object.values(PolicyEngineEvents);
    for (const [key, value] of Object.entries(PolicyEngineEvents)) {
        it(`${key} carries a unique policy-engine subject`, () => {
            assert.equal(typeof value, 'string');
            assert.ok(value.startsWith('policy-engine'));
            assert.equal(values.filter((v) => v === value).length, 1);
        });
    }
});
