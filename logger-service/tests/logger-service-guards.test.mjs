import assert from 'node:assert/strict';
import { LoggerService, LoggerModule } from '../dist/api/logger.service.js';

const service = new LoggerService();

describe('LoggerService.writeLog input guard', () => {
    it('rejects a null message with a MessageError', async () => {
        const result = await service.writeLog(null, {});
        assert.equal(result.code, 500);
        assert.equal(result.error, 'Log message is empty');
    });

    it('rejects an undefined message', async () => {
        const result = await service.writeLog(undefined, {});
        assert.equal(result.error, 'Log message is empty');
    });

    it('rejects an empty-string message', async () => {
        const result = await service.writeLog('', {});
        assert.equal(result.error, 'Log message is empty');
    });

    it('rejects a zero message', async () => {
        const result = await service.writeLog(0, {});
        assert.equal(result.error, 'Log message is empty');
    });

    it('error responses carry a null body', async () => {
        const result = await service.writeLog(null, {});
        assert.equal(result.body, null);
    });
});

describe('LoggerService surface', () => {
    it('exposes the three message handlers', () => {
        assert.equal(typeof service.writeLog, 'function');
        assert.equal(typeof service.getLogs, 'function');
        assert.equal(typeof service.getAttributes, 'function');
    });

    it('exports the LoggerModule class', () => {
        assert.equal(typeof LoggerModule, 'function');
    });
});
