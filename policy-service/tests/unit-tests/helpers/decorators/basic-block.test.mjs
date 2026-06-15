import 'module-alias/register.js';

import { assert } from 'chai';

import { BasicBlock } from '../../../../dist/policy-engine/helpers/decorators/basic-block.js';

describe('Basic Block', function() {
    it('Create', async function() {
        const fn  = BasicBlock({blockType: 'basicBlock', children: []});
        const result = new fn(function () {});
        assert(result.blockType, 'basicBlock');
        assert.isUndefined(result.children);
        assert.isUndefined(result.parent);
        assert.isUndefined(result.uuid);
        assert.isUndefined(result.options);

    })

    describe('setPropValue', function () {
        // Build a prototype-only instance — the method does not use `this`,
        // so we can skip the heavy constructor (which expects a real
        // ComponentsService and DatabaseServer).
        const DecoratedClass = BasicBlock({ blockType: 'basicBlock' })(class BaseDummy {});
        const instance = Object.create(DecoratedClass.prototype);

        it('assigns a top-level value', function () {
            const props = {};
            instance.setPropValue(props, 'name', 'hello');
            assert.deepEqual(props, { name: 'hello' });
        });

        it('walks dotted paths and creates intermediate objects', function () {
            const props = {};
            instance.setPropValue(props, 'a.b.c', 42);
            assert.deepEqual(props, { a: { b: { c: 42 } } });
        });

        it('preserves siblings when assigning a new leaf', function () {
            const props = { a: { keep: 'me' } };
            instance.setPropValue(props, 'a.b', 'new');
            assert.deepEqual(props, { a: { keep: 'me', b: 'new' } });
        });

        it('is a no-op on an empty path', function () {
            const props = { keep: 'me' };
            instance.setPropValue(props, '', 'ignored');
            assert.deepEqual(props, { keep: 'me' });
        });

        it('rejects __proto__ at the leaf', function () {
            const props = {};
            instance.setPropValue(props, '__proto__', { polluted: true });
            assert.isUndefined({}.polluted, 'Object.prototype must not be polluted');
            assert.deepEqual(props, {});
        });

        it('rejects __proto__ midway through a path', function () {
            const props = {};
            instance.setPropValue(props, '__proto__.polluted', true);
            assert.isUndefined({}.polluted, 'Object.prototype must not be polluted');
            assert.deepEqual(props, {});
        });

        it('rejects constructor and prototype segments', function () {
            const props = {};
            instance.setPropValue(props, 'constructor.prototype.bad', true);
            assert.isUndefined({}.bad, 'Object.prototype must not be polluted');
            assert.deepEqual(props, {});

            instance.setPropValue(props, 'prototype.x', 1);
            assert.deepEqual(props, {});
        });
    });
})
