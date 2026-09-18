import assert from 'node:assert/strict';
import { UserPermissions } from '../dist/helpers/permissions-helper.js';
import { Permissions } from '../dist/type/index.js';

const getters = [
    'TEMPLATES_TEMPLATE_CREATE',
    'TEMPLATES_TEMPLATE_READ',
    'TEMPLATES_TEMPLATE_UPDATE',
    'TEMPLATES_TEMPLATE_DELETE',
    'TEMPLATES_TEMPLATE_REVIEW',
];

describe('UserPermissions getter matrix (schema-templates permissions)', () => {
    it('every TEMPLATES getter maps to a declared permission constant', () => {
        for (const name of getters) {
            assert.equal(typeof Permissions[name], 'string', name);
        }
    });

    for (const name of getters) {
        it(`${name} reflects the granted permission`, () => {
            const granted = new UserPermissions({ role: 'USER', permissions: [Permissions[name]] });
            const denied = new UserPermissions({ role: 'USER', permissions: [] });
            assert.equal(granted[name], true);
            assert.equal(denied[name], false);
        });
    }
});
