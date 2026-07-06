import assert from 'node:assert/strict';
import { BlockErrorActions } from '../dist/type/block-error-actions.js';

describe('BlockErrorActions enum', () => {
    it('exposes the documented action ids', () => {
        assert.equal(BlockErrorActions.NO_ACTION, 'no-action');
        assert.equal(BlockErrorActions.RETRY, 'retry');
        assert.equal(BlockErrorActions.GOTO_STEP, 'goto-step');
        assert.equal(BlockErrorActions.GOTO_TAG, 'goto-tag');
        assert.equal(BlockErrorActions.DEBUG, 'debug');
    });
    it('values are kebab-cased identifiers', () => {
        for (const v of Object.values(BlockErrorActions)) {
            assert.match(v, /^[a-z]+(-[a-z]+)*$/);
        }
    });
});
