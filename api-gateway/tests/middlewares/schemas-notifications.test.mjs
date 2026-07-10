import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { NotificationType, NotificationAction } from '@guardian/interfaces';
import {
    NotificationDTO,
    ProgressDTO,
} from '../../dist/middlewares/validation/schemas/notifications.js';

const assignTo = (Cls, props) => Object.assign(new Cls(), props);
const someType = Object.values(NotificationType)[0];
const someAction = Object.values(NotificationAction)[0];

describe('NotificationDTO (class-validator)', () => {
    it('passes with only the required type set', async () => {
        const errs = await validate(assignTo(NotificationDTO, { type: someType }));
        assert.equal(errs.length, 0);
    });

    it('passes with a full set of optional fields', async () => {
        const errs = await validate(assignTo(NotificationDTO, {
            id: '1', title: 't', message: 'm', read: false, old: true,
            type: someType, action: someAction,
        }));
        assert.equal(errs.length, 0);
    });

    it('rejects an invalid type enum value', async () => {
        const errs = await validate(assignTo(NotificationDTO, { type: 'NOT_A_TYPE' }));
        assert.ok(errs.some((e) => e.property === 'type'));
    });

    it('rejects an invalid action enum value', async () => {
        const errs = await validate(assignTo(NotificationDTO, { type: someType, action: 'NOT_AN_ACTION' }));
        assert.ok(errs.some((e) => e.property === 'action'));
    });

    it('rejects a non-string title', async () => {
        const errs = await validate(assignTo(NotificationDTO, { type: someType, title: 5 }));
        assert.ok(errs.some((e) => e.property === 'title'));
    });

    it('rejects a non-boolean read flag', async () => {
        const errs = await validate(assignTo(NotificationDTO, { type: someType, read: 'yes' }));
        assert.ok(errs.some((e) => e.property === 'read'));
    });
});

describe('ProgressDTO (class-validator)', () => {
    it('passes with required action, progress, and type', async () => {
        const errs = await validate(assignTo(ProgressDTO, { action: 'Publish', progress: 50, type: someType }));
        assert.equal(errs.length, 0);
    });

    it('rejects a non-number progress', async () => {
        const errs = await validate(assignTo(ProgressDTO, { action: 'Publish', progress: 'half', type: someType }));
        assert.ok(errs.some((e) => e.property === 'progress'));
    });

    it('rejects a missing action', async () => {
        const errs = await validate(assignTo(ProgressDTO, { progress: 10, type: someType }));
        assert.ok(errs.some((e) => e.property === 'action'));
    });

    it('rejects an invalid type enum', async () => {
        const errs = await validate(assignTo(ProgressDTO, { action: 'Publish', progress: 10, type: 'NOPE' }));
        assert.ok(errs.some((e) => e.property === 'type'));
    });

    it('accepts an optional taskId string', async () => {
        const errs = await validate(assignTo(ProgressDTO, { action: 'Publish', progress: 10, type: someType, taskId: 'task-1' }));
        assert.equal(errs.length, 0);
    });
});
