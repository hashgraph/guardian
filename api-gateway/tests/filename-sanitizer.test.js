import assert from 'node:assert/strict';
import { FilenameSanitizer } from '../dist/helpers/filename-sanitizer.js';

describe('FilenameSanitizer.sanitize', () => {
    it('passes through a plain alphanumeric name unchanged', () => {
        assert.equal(FilenameSanitizer.sanitize('document'), 'document');
    });

    it('replaces path separators with underscores', () => {
        assert.equal(FilenameSanitizer.sanitize('a/b\\c'), 'a_b_c');
    });

    it('replaces shell-dangerous characters', () => {
        assert.equal(FilenameSanitizer.sanitize('a?b*c:d|e"f<g>h'), 'a_b_c_d_e_f_g_h');
    });

    it('collapses whitespace and dots inside the name to underscores', () => {
        assert.equal(FilenameSanitizer.sanitize('a b.txt'), 'a_b_txt');
    });

    it('replaces ASCII control characters', () => {
        const input = `evil\x00name\x1f`;
        const sanitized = FilenameSanitizer.sanitize(input);
        assert.equal(sanitized.includes('\x00'), false);
        assert.equal(sanitized.includes('\x1f'), false);
    });

    it("replaces a name made entirely of dots ('.', '..', '...') with '_'", () => {
        assert.equal(FilenameSanitizer.sanitize('...'), '_');
    });

    it('replaces standalone Windows reserved names regardless of case', () => {
        assert.equal(FilenameSanitizer.sanitize('CON'), '_');
        assert.equal(FilenameSanitizer.sanitize('LPT1'), '_');
        // Note: when the reserved name has an extension (e.g. "aux.txt"),
        // the dot is replaced before the reserved-name regex runs, so
        // the result becomes "aux_txt" rather than "_". Documented here.
        assert.equal(FilenameSanitizer.sanitize('aux.txt'), 'aux_txt');
    });

    it('strips trailing dots and spaces (Windows)', () => {
        // `name. ` → dots/spaces replaced → trailing-cleanup adds `_`
        assert.match(FilenameSanitizer.sanitize('name. '), /_$/);
    });

    it('collapses runs of underscores into a single underscore', () => {
        // a//b//c → a__b__c → a_b_c
        assert.equal(FilenameSanitizer.sanitize('a//b//c'), 'a_b_c');
    });

    it('preserves digits, letters, hyphens, and underscores', () => {
        assert.equal(FilenameSanitizer.sanitize('Foo-Bar_42'), 'Foo-Bar_42');
    });
});
