import assert from 'node:assert/strict';
import { ModelHelper } from '../dist/helpers/model-helper.js';

describe('ModelHelper.checkVersionFormat', () => {
    it('accepts canonical X.Y.Z formats', () => {
        assert.equal(ModelHelper.checkVersionFormat('1'), true);
        assert.equal(ModelHelper.checkVersionFormat('1.0'), true);
        assert.equal(ModelHelper.checkVersionFormat('1.2.3'), true);
        assert.equal(ModelHelper.checkVersionFormat('10.20.30'), true);
    });

    it('rejects pre-release / non-numeric segments', () => {
        assert.equal(ModelHelper.checkVersionFormat('1.0.0-alpha'), false);
        assert.equal(ModelHelper.checkVersionFormat('v1.0.0'), false);
        assert.equal(ModelHelper.checkVersionFormat('1.0.0.0'), false); // 4 segments not allowed
    });

    it('rejects empty / whitespace input', () => {
        assert.equal(ModelHelper.checkVersionFormat(''), false);
        assert.equal(ModelHelper.checkVersionFormat(' '), false);
    });
});

describe('ModelHelper.versionCompare', () => {
    it('treats missing v2 as v1 being newer', () => {
        assert.equal(ModelHelper.versionCompare('1.0.0', null), 1);
        assert.equal(ModelHelper.versionCompare('1.0.0', undefined), 1);
        assert.equal(ModelHelper.versionCompare('1.0.0', ''), 1);
    });

    it('returns 0 for identical versions', () => {
        assert.equal(ModelHelper.versionCompare('2.3.4', '2.3.4'), 0);
    });

    it('returns 1 / -1 by descending precedence', () => {
        assert.equal(ModelHelper.versionCompare('2.0.0', '1.9.9'), 1);
        assert.equal(ModelHelper.versionCompare('1.0.0', '2.0.0'), -1);
        assert.equal(ModelHelper.versionCompare('1.10.0', '1.9.9'), 1);
        assert.equal(ModelHelper.versionCompare('1.9.9', '1.10.0'), -1);
    });

    it('returns 1 when v1 has more components than v2', () => {
        assert.equal(ModelHelper.versionCompare('1.0.1', '1.0'), 1);
    });

    it('returns -1 when v1 is shorter than v2', () => {
        assert.equal(ModelHelper.versionCompare('1.0', '1.0.1'), -1);
    });
});
