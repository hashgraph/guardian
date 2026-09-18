import assert from 'node:assert/strict';
import { Permissions } from '../dist/type/permissions.type.js';

describe('Permissions enum (master list)', () => {
    it('exposes representative CRUD permissions across resources', () => {
        for (const k of [
            'ACCOUNTS_ACCOUNT_READ',
            'ANALYTIC_POLICY_READ',
            'ARTIFACTS_FILE_CREATE',
            'ARTIFACTS_FILE_DELETE',
        ]) {
            assert.equal(Permissions[k], k);
        }
    });
    it('all keys equal their values (string-enum invariant)', () => {
        for (const [k, v] of Object.entries(Permissions)) assert.equal(k, v);
    });
    it('contains 100+ permission entries', () => {
        assert.ok(Object.keys(Permissions).length >= 100);
    });
});
