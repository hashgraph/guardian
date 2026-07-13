import assert from 'node:assert/strict';
import { NotificationType } from '../dist/type/notification.type.js';

describe('NotificationType enum', () => {
    it('exposes INFO / ERROR / WARN / SUCCESS', () => {
        for (const k of ['INFO', 'ERROR', 'WARN', 'SUCCESS']) {
            assert.equal(NotificationType[k], k);
        }
    });
});
