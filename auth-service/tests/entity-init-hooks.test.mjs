import { assert } from 'chai';
import { Role } from '../dist/entity/role.js';
import { RelayerAccount } from '../dist/entity/relayer-account.js';
import { User } from '../dist/entity/user.js';

describe('@unit Role.setInitState', () => {
    it('defaults empty name to empty string', () => {
        const r = new Role();
        r.setInitState();
        assert.equal(r.name, '');
    });

    it('defaults empty owner to empty string', () => {
        const r = new Role();
        r.setInitState();
        assert.equal(r.owner, '');
    });

    it('defaults missing permissions to empty array', () => {
        const r = new Role();
        r.setInitState();
        assert.isArray(r.permissions);
        assert.lengthOf(r.permissions, 0);
    });

    it('preserves an existing name', () => {
        const r = new Role();
        r.name = 'Editor';
        r.setInitState();
        assert.equal(r.name, 'Editor');
    });

    it('preserves an existing owner', () => {
        const r = new Role();
        r.owner = 'owner-1';
        r.setInitState();
        assert.equal(r.owner, 'owner-1');
    });

    it('preserves an existing permissions array', () => {
        const r = new Role();
        r.permissions = ['A', 'B'];
        r.setInitState();
        assert.deepEqual(r.permissions, ['A', 'B']);
    });

    it('replaces a non-array permissions value with []', () => {
        const r = new Role();
        r.permissions = 'not-array';
        r.setInitState();
        assert.deepEqual(r.permissions, []);
    });

    it('treats null name as empty string', () => {
        const r = new Role();
        r.name = null;
        r.setInitState();
        assert.equal(r.name, '');
    });

    it('keeps an empty permissions array as empty (idempotent)', () => {
        const r = new Role();
        r.permissions = [];
        r.setInitState();
        assert.deepEqual(r.permissions, []);
    });

    it('is idempotent across repeated calls', () => {
        const r = new Role();
        r.name = 'X';
        r.setInitState();
        r.setInitState();
        assert.equal(r.name, 'X');
        assert.deepEqual(r.permissions, []);
    });
});

describe('@unit RelayerAccount.setInitState', () => {
    it('defaults empty name to empty string', () => {
        const a = new RelayerAccount();
        a.setInitState();
        assert.equal(a.name, '');
    });

    it('defaults empty owner to empty string', () => {
        const a = new RelayerAccount();
        a.setInitState();
        assert.equal(a.owner, '');
    });

    it('defaults empty account to empty string', () => {
        const a = new RelayerAccount();
        a.setInitState();
        assert.equal(a.account, '');
    });

    it('preserves a provided name', () => {
        const a = new RelayerAccount();
        a.name = 'relayer';
        a.setInitState();
        assert.equal(a.name, 'relayer');
    });

    it('preserves a provided owner', () => {
        const a = new RelayerAccount();
        a.owner = 'o-9';
        a.setInitState();
        assert.equal(a.owner, 'o-9');
    });

    it('preserves a provided account', () => {
        const a = new RelayerAccount();
        a.account = '0.0.42';
        a.setInitState();
        assert.equal(a.account, '0.0.42');
    });

    it('does not touch parent or username fields', () => {
        const a = new RelayerAccount();
        a.parent = 'p';
        a.username = 'u';
        a.setInitState();
        assert.equal(a.parent, 'p');
        assert.equal(a.username, 'u');
    });

    it('coerces null fields to empty strings', () => {
        const a = new RelayerAccount();
        a.name = null;
        a.owner = null;
        a.account = null;
        a.setInitState();
        assert.equal(a.name, '');
        assert.equal(a.owner, '');
        assert.equal(a.account, '');
    });
});

describe('@unit User.setInitState', () => {
    it('defaults role to USER when unset', () => {
        const u = new User();
        u.setInitState();
        assert.equal(u.role, 'USER');
    });

    it('defaults location to LOCAL when unset', () => {
        const u = new User();
        u.setInitState();
        assert.equal(u.location, 'local');
    });

    it('preserves an explicitly set role', () => {
        const u = new User();
        u.role = 'STANDARD_REGISTRY';
        u.setInitState();
        assert.equal(u.role, 'STANDARD_REGISTRY');
    });

    it('preserves an explicitly set location', () => {
        const u = new User();
        u.location = 'REMOTE';
        u.setInitState();
        assert.equal(u.location, 'REMOTE');
    });

    it('coerces null role back to the USER default', () => {
        const u = new User();
        u.role = null;
        u.setInitState();
        assert.equal(u.role, 'USER');
    });

    it('coerces null location back to the LOCAL default', () => {
        const u = new User();
        u.location = null;
        u.setInitState();
        assert.equal(u.location, 'local');
    });

    it('is idempotent', () => {
        const u = new User();
        u.role = 'AUDITOR';
        u.setInitState();
        u.setInitState();
        assert.equal(u.role, 'AUDITOR');
        assert.equal(u.location, 'local');
    });
});
