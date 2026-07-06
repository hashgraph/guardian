import assert from 'node:assert/strict';
import { LoggerService } from '../dist/api/logger.service.js';

const service = new LoggerService();

describe('LoggerService.writeLog with a valid message', () => {
    it('returns a MessageError when the database layer is not initialized', async () => {
        const result = await service.writeLog({ message: 'hi', type: 'INFO' }, {});
        assert.equal(result.code, 500);
        assert.ok(typeof result.error === 'string');
    });

    it('attempts persistence (surfacing the ORM-not-initialized error)', async () => {
        const result = await service.writeLog({ message: 'persist-me' }, {});
        assert.match(String(result.error), /ORM is not initialized/);
    });
});

describe('LoggerService.getLogs', () => {
    it('returns a MessageError when the query layer is not initialized', async () => {
        const result = await service.getLogs({ filters: {}, pageParameters: {} }, {});
        assert.equal(result.code, 500);
        assert.match(String(result.error), /ORM is not initialized/);
    });

    it('handles a missing message object', async () => {
        const result = await service.getLogs(undefined, {});
        assert.equal(result.code, 500);
    });

    it('handles an explicit sortDirection', async () => {
        const result = await service.getLogs({ filters: {}, sortDirection: 'asc' }, {});
        assert.equal(result.code, 500);
    });
});

describe('LoggerService.getAttributes', () => {
    it('returns a MessageError when aggregation cannot run', async () => {
        const result = await service.getAttributes({ name: 'x' }, {});
        assert.equal(result.code, 500);
        assert.ok(typeof result.error === 'string');
    });

    it('handles a missing name (default empty filter)', async () => {
        const result = await service.getAttributes({ existingAttributes: ['a'] }, {});
        assert.equal(result.code, 500);
    });

    it('handles provided filters', async () => {
        const result = await service.getAttributes({ name: 'y', filters: { datetime: { $gte: 1 } } }, {});
        assert.equal(result.code, 500);
    });
});
