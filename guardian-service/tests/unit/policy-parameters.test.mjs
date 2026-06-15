import 'reflect-metadata';
import { assert } from 'chai';
import moduleAlias from 'module-alias';
import dotenv from 'dotenv';

dotenv.config();

moduleAlias.addAliases({
    '@api': process.cwd() + '/dist' + '/api',
    '@entity': process.cwd() + '/dist' + '/entity',
    '@helpers': process.cwd() + '/dist' + '/helpers',
    '@auth': process.cwd() + '/dist' + '/auth',
    '@policy-engine': process.cwd() + '/dist' + '/policy-engine',
    '@hedera-modules': process.cwd() + '/dist' + '/hedera-modules/index',
    '@document-loader': process.cwd() + '/dist' + '/document-loader',
    '@database-modules': process.cwd() + '/dist' + '/database-modules',
});

import { PolicyEngineService } from '../../dist/policy-engine/policy-engine.service.js';

describe('PolicyEngineService.hasFieldPermission', function () {
    // Skip the real constructor — it builds a NATS channel.
    // hasFieldPermission does not reference `this`, so a prototype-only
    // instance is enough.
    const service = Object.create(PolicyEngineService.prototype);

    const field = (visible) => ({ visible });

    it('returns false for a null field', function () {
        assert.isFalse(service.hasFieldPermission(null, 'Administrator'));
    });

    it('returns false when visible is not an array', function () {
        assert.isFalse(service.hasFieldPermission({ visible: undefined }, 'Administrator'));
        assert.isFalse(service.hasFieldPermission({ visible: 'Administrator' }, 'Administrator'));
    });

    it('grants any role when ANY_ROLE is allowed', function () {
        assert.isTrue(service.hasFieldPermission(field(['ANY_ROLE']), 'No role'));
        assert.isTrue(service.hasFieldPermission(field(['ANY_ROLE']), 'Administrator'));
        assert.isTrue(service.hasFieldPermission(field(['ANY_ROLE']), 'Installer'));
    });

    it('grants the exact policy role match', function () {
        assert.isTrue(service.hasFieldPermission(field(['Installer']), 'Installer'));
        assert.isFalse(service.hasFieldPermission(field(['Installer']), 'Auditor'));
    });

    it('grants NO_ROLE only when user role is "No role"', function () {
        assert.isTrue(service.hasFieldPermission(field(['NO_ROLE']), 'No role'));
        assert.isFalse(service.hasFieldPermission(field(['NO_ROLE']), 'Administrator'));
        assert.isFalse(service.hasFieldPermission(field(['NO_ROLE']), 'Installer'));
    });

    it('grants OWNER only when user is Administrator', function () {
        assert.isTrue(service.hasFieldPermission(field(['OWNER']), 'Administrator'));
        assert.isFalse(service.hasFieldPermission(field(['OWNER']), 'No role'));
        assert.isFalse(service.hasFieldPermission(field(['OWNER']), 'Installer'));
    });

    it('returns a plain boolean, not a Promise', function () {
        const result = service.hasFieldPermission(field(['ANY_ROLE']), 'Installer');
        assert.isBoolean(result);
        assert.notInstanceOf(result, Promise);
    });

    it('works as an Array.prototype.filter predicate', function () {
        // Pins the synchronous behavior. An async predicate would return a
        // Promise that filter() treats as always-truthy, silently disabling
        // the role gate.
        const fields = [
            field(['ANY_ROLE']),
            field(['Auditor']),
            field(['OWNER']),
        ];
        const visible = fields.filter((f) => service.hasFieldPermission(f, 'Installer'));
        assert.lengthOf(visible, 1);
        assert.deepEqual(visible[0].visible, ['ANY_ROLE']);
    });
});
