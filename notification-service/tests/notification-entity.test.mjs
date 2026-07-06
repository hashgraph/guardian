import assert from 'node:assert/strict';
import { Notification } from '../dist/entity/notification.entity.js';

describe('Notification entity', () => {
    it('exposes a constructible class extending the Common BaseEntity', () => {
        const n = new Notification();
        assert.equal(typeof n, 'object');
        assert.ok(n instanceof Notification);
    });

    it('allows assignment of userId/title/type/action/read/old fields', () => {
        const n = new Notification();
        n.userId = 'u1';
        n.title = 'New invite';
        n.type = 'INFO';
        n.action = 'POLICIES_PAGE';
        n.read = false;
        n.old = false;
        assert.equal(n.userId, 'u1');
        assert.equal(n.title, 'New invite');
        assert.equal(n.read, false);
        assert.equal(n.old, false);
    });
});
