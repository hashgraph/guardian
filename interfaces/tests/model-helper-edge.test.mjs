import assert from 'node:assert/strict';
import { ModelHelper } from '../dist/helpers/model-helper.js';

describe('ModelHelper.checkVersionFormat — edge & quirks', () => {
    it('accepts leading zeros in any segment', () => {
        assert.equal(ModelHelper.checkVersionFormat('01.0.0'), true);
        assert.equal(ModelHelper.checkVersionFormat('1.00.007'), true);
    });

    it('accepts a backslash as a segment separator (char-class quirk)', () => {
        assert.equal(ModelHelper.checkVersionFormat('1' + String.fromCharCode(92) + '0'), true);
        assert.equal(ModelHelper.checkVersionFormat('1' + String.fromCharCode(92) + '0' + String.fromCharCode(92) + '0'), true);
    });

    it('rejects a trailing newline (anchored, non-multiline)', () => {
        assert.equal(ModelHelper.checkVersionFormat('1' + String.fromCharCode(10)), false);
        assert.equal(ModelHelper.checkVersionFormat('1.0.0' + String.fromCharCode(10)), false);
    });

    it('rejects embedded tabs and surrounding spaces', () => {
        assert.equal(ModelHelper.checkVersionFormat('1' + String.fromCharCode(9) + '0'), false);
        assert.equal(ModelHelper.checkVersionFormat(' 1.0.0'), false);
        assert.equal(ModelHelper.checkVersionFormat('1.0.0 '), false);
    });

    it('rejects more than three segments', () => {
        assert.equal(ModelHelper.checkVersionFormat('1.2.3.4'), false);
        assert.equal(ModelHelper.checkVersionFormat('1.2.3.4.5'), false);
    });

    it('rejects a sign prefix and trailing dot', () => {
        assert.equal(ModelHelper.checkVersionFormat('+1.0.0'), false);
        assert.equal(ModelHelper.checkVersionFormat('1.0.'), false);
        assert.equal(ModelHelper.checkVersionFormat('.1.0'), false);
    });
});

describe('ModelHelper.versionCompare — edge & quirks', () => {
    it('treats an empty v1 as older than any real version', () => {
        assert.equal(ModelHelper.versionCompare('', '1.0.0'), -1);
    });

    it('treats non-numeric segments (NaN) as lower precedence', () => {
        assert.equal(ModelHelper.versionCompare('a.b.c', '1.0.0'), -1);
        assert.equal(ModelHelper.versionCompare('1.x.0', '1.0.0'), -1);
    });

    it('tolerates leading/trailing whitespace inside numeric segments', () => {
        assert.equal(ModelHelper.versionCompare(' 1.0.0', '1.0.0'), 0);
        assert.equal(ModelHelper.versionCompare('1.0.0 ', '1.0.0'), 0);
    });

    it('orders equal-prefix versions by length in both directions', () => {
        assert.equal(ModelHelper.versionCompare('1.0', '1.0.0'), -1);
        assert.equal(ModelHelper.versionCompare('1.0.0', '1.0'), 1);
    });

    it('compares multi-digit segments numerically, not lexically', () => {
        assert.equal(ModelHelper.versionCompare('1.100.0', '1.99.0'), 1);
        assert.equal(ModelHelper.versionCompare('1.9.0', '1.10.0'), -1);
    });

    it('handles very large numeric segments', () => {
        assert.equal(ModelHelper.versionCompare('999999999.0.0', '1.0.0'), 1);
        assert.equal(ModelHelper.versionCompare('1.0.0', '999999999.0.0'), -1);
    });
});
