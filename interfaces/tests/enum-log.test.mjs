import assert from 'node:assert/strict';
import { LogType } from '../dist/type/log.type.js';

describe('LogType enum', () => {
    it('exposes WARN / INFO / ERROR', () => {
        assert.equal(LogType.WARN, 'WARN');
        assert.equal(LogType.INFO, 'INFO');
        assert.equal(LogType.ERROR, 'ERROR');
    });
});
