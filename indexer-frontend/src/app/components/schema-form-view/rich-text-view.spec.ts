import { isSafeHref, withNewTabLinks } from './rich-text-view';

describe('rich-text-view', () => {

    describe('withNewTabLinks', () => {

        it('should add the new tab attributes to a link that has none', () => {
            const result = withNewTabLinks('<p>See <a href="https://example.com">this</a></p>');
            expect(result).toContain('target="_blank"');
            expect(result).toContain('rel="noopener noreferrer"');
        });

        it('should keep the text and the supported tags', () => {
            const value = '<h2>Title</h2><ul><li><b>One</b></li></ul>';
            expect(withNewTabLinks(value)).toBe(value);
        });

        it('should return an empty string for a value that is not a string', () => {
            expect(withNewTabLinks(null)).toBe('');
            expect(withNewTabLinks(undefined)).toBe('');
            expect(withNewTabLinks(42)).toBe('');
        });
    });

    describe('isSafeHref', () => {

        it('should accept http, https, mailto and a relative target', () => {
            expect(isSafeHref('https://example.com')).toBeTrue();
            expect(isSafeHref('http://example.com')).toBeTrue();
            expect(isSafeHref('mailto:name@example.com')).toBeTrue();
            expect(isSafeHref('page.html')).toBeTrue();
        });

        it('should refuse a script target and an empty one', () => {
            expect(isSafeHref('javascript:alert(1)')).toBeFalse();
            expect(isSafeHref('')).toBeFalse();
        });
    });
});
