import { assert } from 'chai';
import { getPageOptions, escapeRegExp } from '../../dist/api/helpers/api-helper.js';

describe('getPageOptions', () => {
    it('returns "all" sentinel: only orderBy DESC, no limit/offset', () => {
        const opts = getPageOptions({ pageSize: 'all' });
        assert.deepEqual(opts.orderBy, { createDate: 'DESC' });
        assert.isUndefined(opts.limit);
        assert.isUndefined(opts.offset);
    });

    it('parses integer pageSize/pageIndex and sets limit/offset', () => {
        const opts = getPageOptions({ pageSize: 25, pageIndex: 2 });
        assert.deepEqual(opts.orderBy, { createDate: 'DESC' });
        assert.equal(opts.limit, 25);
        assert.equal(opts.offset, 50);
    });

    it('parses string-numeric pageSize/pageIndex', () => {
        const opts = getPageOptions({ pageSize: '10', pageIndex: '3' });
        assert.equal(opts.limit, 10);
        assert.equal(opts.offset, 30);
    });

    it('caps limit at 1000 when pageSize is huge', () => {
        const opts = getPageOptions({ pageSize: 50000, pageIndex: 0 });
        assert.equal(opts.limit, 1000);
        assert.equal(opts.offset, 0);
    });

    it('falls back to limit=1000, offset=0 when pageSize is non-numeric', () => {
        const opts = getPageOptions({ pageSize: 'abc', pageIndex: 'def' });
        assert.equal(opts.limit, 1000);
        assert.equal(opts.offset, 0);
        assert.deepEqual(opts.orderBy, { createDate: 'DESC' });
    });

    it('falls back when pageIndex/pageSize are missing', () => {
        const opts = getPageOptions({});
        assert.equal(opts.limit, 1000);
        assert.equal(opts.offset, 0);
    });

    it('passes fields through onto returned options', () => {
        const opts = getPageOptions({ pageSize: 5, pageIndex: 0, fields: ['id', 'name'] });
        assert.deepEqual(opts.fields, ['id', 'name']);
    });

    it('merges into a caller-supplied options object', () => {
        const base = { custom: 'value' };
        const opts = getPageOptions({ pageSize: 10, pageIndex: 1 }, base);
        assert.equal(opts.custom, 'value');
        assert.equal(opts.limit, 10);
        assert.equal(opts.offset, 10);
        assert.strictEqual(opts, base, 'should mutate and return the same object');
    });

    it('does not set fields when not provided', () => {
        const opts = getPageOptions({ pageSize: 10, pageIndex: 0 });
        assert.isUndefined(opts.fields);
    });
});

describe('escapeRegExp', () => {
    it('escapes regex special characters', () => {
        const escaped = escapeRegExp('a.b*c+d?e^f$');
        // Each special char must now be backslash-prefixed
        assert.match(escaped, /^a\\\.b\\\*c\\\+d\\\?e\\\^f\\\$$/);
    });

    it('leaves alphanumerics unchanged', () => {
        assert.equal(escapeRegExp('hello world 123'), 'hello world 123');
    });

    it('escapes parens, braces, brackets, pipes, slashes, backslashes', () => {
        const escaped = escapeRegExp('(){}[]|/\\');
        for (const ch of '(){}[]|/\\') {
            assert.include(escaped, '\\' + ch);
        }
    });

    it('result is a safe substring matcher when wrapped in RegExp', () => {
        const needle = 'a+b.c';
        const re = new RegExp(escapeRegExp(needle));
        assert.isTrue(re.test('zz a+b.c yy'));
        assert.isFalse(re.test('axxbXc'));
    });
});
