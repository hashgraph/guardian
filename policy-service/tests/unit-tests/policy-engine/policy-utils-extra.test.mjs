import assert from 'node:assert/strict';

let PolicyUtils, QueryType;
try {
    ({ PolicyUtils, QueryType } = await import('../../../dist/policy-engine/helpers/utils.js'));
} catch (e) {
    console.warn('[policy-utils-extra.test] dist import failed:', e.message);
}

describe('@unit PolicyUtils — additional pure helpers', () => {
    if (!PolicyUtils) { it.skip('dist not available', () => {}); return; }

    it('PolicyUtils and QueryType are defined', () => {
        assert.equal(typeof PolicyUtils, 'function');
        assert.equal(typeof QueryType, 'object');
        assert.equal(QueryType.eq, 'equal');
        assert.equal(QueryType.regex, 'regex');
    });

    describe('getQueryFilter', () => {
        it('builds an $eq expression for a plain string value', () => {
            const f = PolicyUtils.getQueryFilter('foo', 'bar');
            assert.deepEqual(f, { $eq: ['$foo', 'bar'] });
        });

        it('rewrites credentialSubject.0 prefix to firstCredentialSubject', () => {
            const f = PolicyUtils.getQueryFilter('document.credentialSubject.0.id', 'x');
            assert.deepEqual(f, { $eq: ['$firstCredentialSubject.id', 'x'] });
        });

        it('rewrites verifiableCredential.0 prefix', () => {
            const f = PolicyUtils.getQueryFilter('document.verifiableCredential.0.field', 'y');
            assert.deepEqual(f, { $eq: ['$firstVerifiableCredential.field', 'y'] });
        });

        it('uses the operation from an object value', () => {
            const f = PolicyUtils.getQueryFilter('field', { $gt: 'abc' });
            assert.deepEqual(f, { $gt: ['$field', 'abc'] });
        });

        it('produces an $or for numeric string/number values', () => {
            const f = PolicyUtils.getQueryFilter('field', '5');
            assert.deepEqual(f, { $or: [{ $eq: ['$field', '5'] }, { $eq: ['$field', 5] }] });
        });

        it('produces an $and for $ne over numeric values', () => {
            const f = PolicyUtils.getQueryFilter('field', { $ne: '5' });
            assert.deepEqual(f, { $and: [{ $ne: ['$field', '5'] }, { $ne: ['$field', 5] }] });
        });

        it('produces a double $not/$in $and for $nin over numeric values', () => {
            const f = PolicyUtils.getQueryFilter('field', { $nin: '5' });
            assert.deepEqual(f, {
                $and: [
                    { $not: { $in: ['$field', '5'] } },
                    { $not: { $in: ['$field', 5] } }
                ]
            });
        });

        it('produces a $not/$in for $nin over a non-numeric value', () => {
            const f = PolicyUtils.getQueryFilter('field', { $nin: 'abc' });
            assert.deepEqual(f, { $not: { $in: ['$field', 'abc'] } });
        });
    });

    describe('deepAssign', () => {
        it('throws when target is null', () => {
            assert.throws(() => PolicyUtils.deepAssign(null, {}), TypeError);
        });

        it('merges shallow scalar properties', () => {
            const out = PolicyUtils.deepAssign({ a: 1 }, { b: 2 });
            assert.deepEqual(out, { a: 1, b: 2 });
        });

        it('deeply merges nested objects', () => {
            const out = PolicyUtils.deepAssign({ a: { x: 1 } }, { a: { y: 2 } });
            assert.deepEqual(out, { a: { x: 1, y: 2 } });
        });

        it('clones array entries rather than sharing references', () => {
            const source = { list: [{ v: 1 }] };
            const out = PolicyUtils.deepAssign({}, source);
            assert.deepEqual(out.list, [{ v: 1 }]);
            assert.notEqual(out.list[0], source.list[0]);
        });

        it('overwrites a non-object target key with an object source', () => {
            const out = PolicyUtils.deepAssign({ a: 5 }, { a: { x: 1 } });
            assert.deepEqual(out, { a: { x: 1 } });
        });

        it('ignores non-object sources', () => {
            const out = PolicyUtils.deepAssign({ a: 1 }, 42, 'str');
            assert.deepEqual(out, { a: 1 });
        });

        it('returns the same target reference', () => {
            const target = {};
            assert.equal(PolicyUtils.deepAssign(target, { a: 1 }), target);
        });
    });

    describe('setDocumentTags', () => {
        it('does nothing when document has no document field', () => {
            const doc = {};
            PolicyUtils.setDocumentTags(doc, [{ inheritTags: true, messageId: 'm' }]);
            assert.deepEqual(doc, {});
        });

        it('does nothing for an empty tag list', () => {
            const doc = { document: {} };
            PolicyUtils.setDocumentTags(doc, []);
            assert.equal(doc.document.tags, undefined);
        });

        it('appends inherited tags into document.tags', () => {
            const doc = { document: {} };
            PolicyUtils.setDocumentTags(doc, [
                { name: 'n', messageId: 'm1', inheritTags: true }
            ]);
            assert.equal(doc.document.tags.length, 1);
            assert.equal(doc.document.tags[0].messageId, 'm1');
        });

        it('skips tags that are not inheritable', () => {
            const doc = { document: { tags: [] } };
            PolicyUtils.setDocumentTags(doc, [{ messageId: 'm', inheritTags: false }]);
            assert.equal(doc.document.tags.length, 0);
        });

        it('does not duplicate a tag already present by messageId', () => {
            const doc = { document: { tags: [{ messageId: 'm1' }] } };
            PolicyUtils.setDocumentTags(doc, [{ messageId: 'm1', inheritTags: true }]);
            assert.equal(doc.document.tags.length, 1);
        });
    });

    describe('getSchemaContext', () => {
        it('returns a synthetic schema context in dry-run', () => {
            const ctx = PolicyUtils.getSchemaContext({ dryRun: true }, { iri: '#abc' });
            assert.equal(ctx, 'schema:abc');
        });

        it('returns the contextURL when not in dry-run', () => {
            const ctx = PolicyUtils.getSchemaContext({ dryRun: false }, { contextURL: 'http://ctx' });
            assert.equal(ctx, 'http://ctx');
        });
    });

    describe('checkDocumentSchema', () => {
        const ref = { dryRun: false };

        it('returns true when there is no document', () => {
            assert.equal(PolicyUtils.checkDocumentSchema(ref, null, { iri: '#a', contextURL: 'c' }), true);
        });

        it('matches a single-subject document against context and iri', () => {
            const schema = { iri: '#MySchema', contextURL: 'http://ctx' };
            const doc = {
                document: {
                    credentialSubject: { '@context': ['http://ctx'], type: 'MySchema' }
                }
            };
            assert.equal(PolicyUtils.checkDocumentSchema(ref, doc, schema), true);
        });

        it('returns false when the subject type does not match', () => {
            const schema = { iri: '#MySchema', contextURL: 'http://ctx' };
            const doc = {
                document: {
                    credentialSubject: { '@context': ['http://ctx'], type: 'Other' }
                }
            };
            assert.equal(PolicyUtils.checkDocumentSchema(ref, doc, schema), false);
        });

        it('matches an array-subject document', () => {
            const schema = { iri: '#S', contextURL: 'http://ctx' };
            const doc = {
                document: {
                    credentialSubject: [{ '@context': ['http://ctx'], type: 'S' }]
                }
            };
            assert.equal(PolicyUtils.checkDocumentSchema(ref, doc, schema), true);
        });
    });
});
