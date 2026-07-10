import assert from 'node:assert/strict';
import { MAX_REDIRECTS } from '../dist/constants/axios.js';

describe('worker-service axios constants', () => {
    it('MAX_REDIRECTS.DEFAULT is 5', () => {
        assert.equal(MAX_REDIRECTS.DEFAULT, 5);
    });
});
