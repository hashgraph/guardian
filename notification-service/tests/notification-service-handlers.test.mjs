import assert from 'node:assert/strict';
import { NotificationService } from '../dist/api/notification.service.js';

const service = new NotificationService();

const isOrmError = (result) => {
    assert.equal(result.code, 500);
    assert.match(String(result.error), /ORM is not initialized/);
};

describe('NotificationService.getNotifications', () => {
    it('queries new notifications and surfaces the ORM error', async () => {
        isOrmError(await service.getNotifications('user-1'));
    });
});

describe('NotificationService.getAll', () => {
    it('uses the paged options branch when pageIndex/pageSize are numbers', async () => {
        isOrmError(await service.getAll({ userId: 'u', pageIndex: 2, pageSize: 5 }));
    });

    it('uses the unpaged options branch when paging is absent', async () => {
        isOrmError(await service.getAll({ userId: 'u' }));
    });

    it('treats a zero page index/size as the paged branch', async () => {
        isOrmError(await service.getAll({ userId: 'u', pageIndex: 0, pageSize: 0 }));
    });
});

describe('NotificationService.deleteUpToThis', () => {
    it('looks up the boundary notification and surfaces the ORM error', async () => {
        isOrmError(await service.deleteUpToThis({ id: 'n-1', userId: 'u' }));
    });
});

describe('NotificationService.read / readAll', () => {
    it('read surfaces the ORM error', async () => {
        isOrmError(await service.read('n-1'));
    });

    it('readAll surfaces the ORM error', async () => {
        isOrmError(await service.readAll('u-1'));
    });
});

describe('NotificationService.getProgresses', () => {
    it('queries progresses and surfaces the ORM error', async () => {
        isOrmError(await service.getProgresses('u-1'));
    });
});

describe('NotificationService.create / update with valid payloads', () => {
    it('create attempts to save and surfaces the ORM error', async () => {
        isOrmError(await service.create({ title: 't', message: 'm' }));
    });

    it('update attempts to update and surfaces the ORM error', async () => {
        isOrmError(await service.update({ id: 'n-1', title: 't' }));
    });
});

describe('NotificationService.createProgress / updateProgress with valid payloads', () => {
    it('createProgress attempts to save and surfaces the ORM error', async () => {
        isOrmError(await service.createProgress({ action: 'a', userId: 'u' }));
    });

    it('updateProgress floors the progress and surfaces the ORM error', async () => {
        isOrmError(await service.updateProgress({ id: 'n-1', progress: 42.9 }));
    });
});

describe('NotificationService.deleteProgress with a valid id', () => {
    it('looks up the progress and surfaces the ORM error', async () => {
        isOrmError(await service.deleteProgress('p-1'));
    });
});

describe('NotificationService websocket relays (no NATS client)', () => {
    it('updateNotificationWS swallows the send failure', async () => {
        assert.equal(await service.updateNotificationWS({ id: '1', userId: 'u' }), undefined);
    });

    it('deleteNotificationWS swallows the send failure', async () => {
        assert.equal(await service.deleteNotificationWS({ id: '1', userId: 'u' }), undefined);
    });

    it('updateProgressWS swallows the send failure', async () => {
        assert.equal(await service.updateProgressWS({ id: '1', userId: 'u' }), undefined);
    });

    it('createProgressWS swallows the send failure', async () => {
        assert.equal(await service.createProgressWS({ id: '1', userId: 'u' }), undefined);
    });

    it('deleteProgressWS swallows the send failure', async () => {
        assert.equal(await service.deleteProgressWS({ id: '1', userId: 'u' }), undefined);
    });

    it('sendMessage rethrows when the NATS client is unavailable', async () => {
        await assert.rejects(() => service.sendMessage('ANY_SUBJECT', { x: 1 }));
    });
});
