import assert from 'node:assert/strict';
import { NotificationService, NotificationModule } from '../dist/api/notification.service.js';

const service = new NotificationService();

describe('NotificationService construction', () => {
    it('constructs repeatedly without error thanks to the static interval guard', () => {
        const again = new NotificationService();
        assert.ok(again instanceof NotificationService);
    });

    it('exports the NotificationModule class', () => {
        assert.equal(typeof NotificationModule, 'function');
    });
});

describe('NotificationService input guards', () => {
    it('create rejects a null payload', async () => {
        const result = await service.create(null);
        assert.equal(result.code, 500);
        assert.equal(result.error, 'Invalid notification create message');
    });

    it('create rejects an undefined payload', async () => {
        const result = await service.create(undefined);
        assert.equal(result.error, 'Invalid notification create message');
    });

    it('update rejects a null payload', async () => {
        const result = await service.update(null);
        assert.equal(result.error, 'Invalid notification update message');
    });

    it('createProgress rejects a null payload', async () => {
        const result = await service.createProgress(null);
        assert.equal(result.error, 'Invalid progress create message');
    });

    it('updateProgress rejects a null payload', async () => {
        const result = await service.updateProgress(null);
        assert.equal(result.error, 'Invalid progress update message');
    });

    it('deleteProgress rejects an empty id', async () => {
        const result = await service.deleteProgress('');
        assert.equal(result.error, 'Invalid notification id');
    });

    it('deleteProgress rejects a null id', async () => {
        const result = await service.deleteProgress(null);
        assert.equal(result.error, 'Invalid notification id');
    });

    it('guard failures respond with a null body and code 500', async () => {
        const result = await service.deleteProgress(null);
        assert.equal(result.body, null);
        assert.equal(result.code, 500);
    });
});
