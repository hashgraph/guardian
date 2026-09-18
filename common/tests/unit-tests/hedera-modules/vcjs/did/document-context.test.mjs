import { assert } from 'chai';

import { DocumentContext } from '../../../../../dist/hedera-modules/vcjs/did/components/document-context.js';

describe('DocumentContext', function () {
    it('new context is empty', function () {
        const ctx = new DocumentContext();
        assert.isTrue(ctx.isEmpty());
        assert.isNull(ctx.toObject());
    });

    it('single context returns string', function () {
        const ctx = new DocumentContext();
        ctx.add('https://example.com/v1');
        assert.isFalse(ctx.isEmpty());
        assert.equal(ctx.toObject(), 'https://example.com/v1');
    });

    it('multiple contexts return array copy', function () {
        const ctx = new DocumentContext();
        ctx.add('a');
        ctx.add('b');
        const obj = ctx.toObject();
        assert.deepEqual(obj, ['a', 'b']);
        obj.push('c');
        assert.deepEqual(ctx.toObject(), ['a', 'b']);
    });

    it('add ignores duplicates', function () {
        const ctx = new DocumentContext();
        ctx.add('a');
        ctx.add('a');
        assert.equal(ctx.toObject(), 'a');
    });

    it('from null returns empty context', function () {
        const ctx = DocumentContext.from(null);
        assert.isTrue(ctx.isEmpty());
    });

    it('from undefined returns empty context', function () {
        const ctx = DocumentContext.from(undefined);
        assert.isTrue(ctx.isEmpty());
    });

    it('from string returns single context', function () {
        const ctx = DocumentContext.from('https://x');
        assert.equal(ctx.toObject(), 'https://x');
    });

    it('from array returns multiple contexts', function () {
        const ctx = DocumentContext.from(['a', 'b']);
        assert.deepEqual(ctx.toObject(), ['a', 'b']);
    });

    it('from array dedupes', function () {
        const ctx = DocumentContext.from(['a', 'a', 'b']);
        assert.deepEqual(ctx.toObject(), ['a', 'b']);
    });

    it('from array with non-string throws', function () {
        assert.throws(() => DocumentContext.from(['a', 5]), 'Invalid document context');
    });

    it('from object throws', function () {
        assert.throws(() => DocumentContext.from({}), 'Invalid document context');
    });

    it('from number throws', function () {
        assert.throws(() => DocumentContext.from(42), 'Invalid document context');
    });
});
