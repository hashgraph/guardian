import assert from 'node:assert/strict';
import { stringifyForLog } from '../dist/helpers/property-suggestion-helper.js';

describe('stringifyForLog', () => {
    it('keeps short values untouched', () => {
        const value = { results: [{ fieldName: 'a', candidates: [] }] };
        assert.equal(stringifyForLog(value), JSON.stringify(value));
    });

    it('shortens long strings to 50 characters', () => {
        const parsed = JSON.parse(stringifyForLog({ title: 'x'.repeat(200) }));
        assert.equal(parsed.title.length, 50);
        assert.ok(parsed.title.endsWith('...'));
    });

    it('caps large arrays and reports how many items were omitted', () => {
        const parsed = JSON.parse(stringifyForLog({ results: Array.from({ length: 12 }, (_, index) => index) }));
        assert.deepEqual(parsed.results, [0, 1, 2, 3, 4, '... +7 more']);
    });

    it('truncates nested values and always returns valid JSON', () => {
        const output = stringifyForLog({
            results: [{ fieldName: 'f', candidates: Array.from({ length: 8 }, () => ({ title: 'y'.repeat(100) })) }]
        });
        const parsed = JSON.parse(output);
        assert.equal(parsed.results[0].candidates.length, 6);
        assert.equal(parsed.results[0].candidates[0].title.length, 50);
    });
});
