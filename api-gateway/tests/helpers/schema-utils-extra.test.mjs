import assert from 'node:assert/strict';
import { SchemaUtils } from '../../dist/helpers/schema-utils.js';
import { SchemaCategory } from '@guardian/interfaces';

describe('SchemaUtils.toOld edge branches', () => {
    it('leaves array entries without document/context untouched', () => {
        const arr = [{ name: 'a' }, { document: { x: 1 } }];
        const out = SchemaUtils.toOld(arr);
        assert.equal(out, arr);
        assert.equal(arr[0].name, 'a');
        assert.equal(arr[1].document, '{"x":1}');
    });

    it('handles a single schema with only a context field', () => {
        const s = { context: { c: 1 } };
        const out = SchemaUtils.toOld(s);
        assert.equal(out.context, '{"c":1}');
        assert.equal(out.document, undefined);
    });

    it('handles a single schema with neither document nor context', () => {
        const s = { name: 'plain' };
        const out = SchemaUtils.toOld(s);
        assert.equal(out, s);
    });
});

describe('SchemaUtils.fromOld partial branches', () => {
    it('parses document but leaves a non-string context as-is', () => {
        const s = { document: '{"a":1}', context: { b: 2 } };
        const out = SchemaUtils.fromOld(s);
        assert.deepEqual(out.document, { a: 1 });
        assert.deepEqual(out.context, { b: 2 });
    });
});

describe('SchemaUtils.checkPermission', () => {
    const user = { username: 'alice', creator: 'alice-c', owner: 'org-1' };

    it('returns an error when the schema is missing', () => {
        assert.equal(SchemaUtils.checkPermission(null, user, SchemaCategory.POLICY), 'Schema does not exist.');
    });

    it('rejects a system schema whose creator does not match username or creator', () => {
        const schema = { system: true, creator: 'bob' };
        assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.SYSTEM), 'Invalid creator.');
    });

    it('allows a system schema when creator matches username', () => {
        const schema = { system: true, creator: 'alice', category: SchemaCategory.SYSTEM };
        assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.SYSTEM), null);
    });

    it('allows a system schema when creator matches the creator field', () => {
        const schema = { system: true, creator: 'alice-c', category: SchemaCategory.SYSTEM };
        assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.SYSTEM), null);
    });

    it('rejects a non-system schema with a mismatched owner', () => {
        const schema = { system: false, owner: 'org-2', category: SchemaCategory.POLICY };
        assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY), 'Invalid creator.');
    });

    describe('TAG type', () => {
        it('rejects a system schema', () => {
            const schema = { system: true, creator: 'alice' };
            assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.TAG), 'Schema is system.');
        });

        it('rejects a non-tag category', () => {
            const schema = { system: false, owner: 'org-1', category: SchemaCategory.POLICY };
            assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.TAG), 'Invalid schema category.');
        });

        it('allows a valid tag schema', () => {
            const schema = { system: false, owner: 'org-1', category: SchemaCategory.TAG };
            assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.TAG), null);
        });
    });

    describe('SYSTEM type', () => {
        it('rejects a non-system schema', () => {
            const schema = { system: false, owner: 'org-1', category: SchemaCategory.SYSTEM };
            assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.SYSTEM), 'Schema is not system.');
        });

        it('rejects a system schema with a POLICY category', () => {
            const schema = { system: true, creator: 'alice', category: SchemaCategory.POLICY };
            assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.SYSTEM), 'Invalid schema category.');
        });

        it('rejects a system schema with a TAG category', () => {
            const schema = { system: true, creator: 'alice', category: SchemaCategory.TAG };
            assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.SYSTEM), 'Invalid schema category.');
        });
    });

    describe('default (e.g. POLICY) type', () => {
        it('rejects a system schema', () => {
            const schema = { system: true, creator: 'alice' };
            assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY), 'Schema is system.');
        });

        it('rejects a SYSTEM category for a non-system schema', () => {
            const schema = { system: false, owner: 'org-1', category: SchemaCategory.SYSTEM };
            assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY), 'Invalid schema category.');
        });

        it('rejects a TAG category for a non-system schema', () => {
            const schema = { system: false, owner: 'org-1', category: SchemaCategory.TAG };
            assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY), 'Invalid schema category.');
        });

        it('allows a valid policy schema', () => {
            const schema = { system: false, owner: 'org-1', category: SchemaCategory.POLICY };
            assert.equal(SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY), null);
        });
    });
});
