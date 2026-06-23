import assert from 'node:assert/strict';
import { parseInteger } from '../../dist/helpers/utils.js';

describe('parseInteger', () => {
    it('parses numeric strings as base-10 integers', () => {
        assert.equal(parseInteger('42'), 42);
        assert.equal(parseInteger('0'), 0);
        assert.equal(parseInteger('-7'), -7);
    });

    it('returns undefined for non-numeric strings', () => {
        assert.equal(parseInteger('abc'), undefined);
        assert.equal(parseInteger(''), undefined);
    });

    it('floors finite numeric input', () => {
        assert.equal(parseInteger(3.9), 3);
        assert.equal(parseInteger(-3.9), -4);
    });

    it('returns undefined for non-finite numbers', () => {
        assert.equal(parseInteger(Infinity), undefined);
        assert.equal(parseInteger(NaN), undefined);
    });

    it('returns undefined for non-string non-number values', () => {
        assert.equal(parseInteger(null), undefined);
        assert.equal(parseInteger(undefined), undefined);
        assert.equal(parseInteger({}), undefined);
        assert.equal(parseInteger(true), undefined);
    });
});
