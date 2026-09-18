import assert from 'node:assert/strict';
import { PinoLogType } from '../dist/type/pino-log.type.js';

describe('PinoLogType enum', () => {
    it('uses lowercase pino level names', () => {
        assert.equal(PinoLogType.TRACE, 'trace');
        assert.equal(PinoLogType.DEBUG, 'debug');
        assert.equal(PinoLogType.INFO, 'info');
        assert.equal(PinoLogType.WARN, 'warn');
        assert.equal(PinoLogType.ERROR, 'error');
        assert.equal(PinoLogType.FATAL, 'fatal');
    });
    it('has six levels', () => {
        assert.equal(Object.keys(PinoLogType).length, 6);
    });
});
