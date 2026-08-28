import { isBlankRichText, isSafeHref, sanitizeRichText, withNewTabLinks } from './rich-text-sanitizer';

describe('sanitizeRichText', () => {
    it('returns an empty string for null, undefined and empty input', () => {
        expect(sanitizeRichText(null)).toBe('');
        expect(sanitizeRichText(undefined)).toBe('');
        expect(sanitizeRichText('')).toBe('');
    });

    it('keeps every tag the ticket asks for', () => {
        const html = '<h1>A</h1><h2>B</h2><h3>C</h3><p><b>b</b><strong>s</strong>' +
            '<i>i</i><em>e</em><u>u</u></p><ul><li>x</li></ul><ol><li>y</li></ol>';
        expect(sanitizeRichText(html)).toBe(html);
    });

    it('removes a script element together with its content', () => {
        expect(sanitizeRichText('<p>ok</p><script>steal()<\/script>')).toBe('<p>ok</p>');
    });

    it('removes an iframe, an object and a style element', () => {
        const html = '<p>ok</p><iframe src="x"></iframe><object></object><style>p{}</style>';
        expect(sanitizeRichText(html)).toBe('<p>ok</p>');
    });

    it('unwraps a tag that is not allowed but keeps its text', () => {
        expect(sanitizeRichText('<p><marquee>text</marquee></p>')).toBe('<p>text</p>');
        expect(sanitizeRichText('<img src="x">text')).toBe('text');
    });

    it('strips every attribute except href on a link', () => {
        expect(sanitizeRichText('<p class="x" style="color:red" onclick="steal()">t</p>'))
            .toBe('<p>t</p>');
        expect(sanitizeRichText('<a href="https://example.com" onclick="steal()">t</a>'))
            .toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">t</a>');
    });

    it('drops an href with an unsupported protocol but keeps the text', () => {
        expect(sanitizeRichText('<a href="javascript:alert(1)">t</a>')).toBe('<a>t</a>');
        expect(sanitizeRichText('<a href="data:text/html;base64,PHA+">t</a>')).toBe('<a>t</a>');
    });

    it('keeps http, https, mailto and relative links', () => {
        expect(sanitizeRichText('<a href="http://a.b">t</a>'))
            .toBe('<a href="http://a.b" target="_blank" rel="noopener noreferrer">t</a>');
        expect(sanitizeRichText('<a href="mailto:u@a.b">t</a>'))
            .toBe('<a href="mailto:u@a.b" target="_blank" rel="noopener noreferrer">t</a>');
        expect(sanitizeRichText('<a href="/local/page">t</a>'))
            .toBe('<a href="/local/page" target="_blank" rel="noopener noreferrer">t</a>');
    });

    it('cleans markup nested inside an allowed tag', () => {
        expect(sanitizeRichText('<ul><li><script>steal()<\/script><b>x</b></li></ul>'))
            .toBe('<ul><li><b>x</b></li></ul>');
    });
});

describe('isSafeHref', () => {
    it('accepts the supported protocols and relative links', () => {
        expect(isSafeHref('https://example.com')).toBeTrue();
        expect(isSafeHref('http://example.com')).toBeTrue();
        expect(isSafeHref('mailto:user@example.com')).toBeTrue();
        expect(isSafeHref('/page')).toBeTrue();
        expect(isSafeHref('page.html')).toBeTrue();
    });

    it('rejects an unsupported protocol, including obfuscated forms', () => {
        expect(isSafeHref('javascript:alert(1)')).toBeFalse();
        expect(isSafeHref('  java\nscript:alert(1)')).toBeFalse();
        expect(isSafeHref('data:text/html,x')).toBeFalse();
        expect(isSafeHref('')).toBeFalse();
    });
});

describe('isBlankRichText', () => {
    it('treats empty, whitespace-only and break-only markup as blank', () => {
        expect(isBlankRichText(null)).toBeTrue();
        expect(isBlankRichText('')).toBeTrue();
        expect(isBlankRichText('<p><br></p>')).toBeTrue();
        expect(isBlankRichText('<p>   </p>')).toBeTrue();
        expect(isBlankRichText('<ul><li></li></ul>')).toBeTrue();
    });

    it('treats markup with real text as not blank', () => {
        expect(isBlankRichText('<p>a</p>')).toBeFalse();
    });
});

describe('withNewTabLinks', () => {
    it('adds new-tab attributes to a link that has none', () => {
        expect(withNewTabLinks('<p><a href="https://example.com">Example</a></p>'))
            .toBe('<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a></p>');
    });

    it('leaves a link that already carries the attributes unchanged', () => {
        const value = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a>';
        expect(withNewTabLinks(value)).toBe(value);
    });

    it('keeps the surrounding structure and text', () => {
        expect(withNewTabLinks('<h1>Title</h1><ul><li><b>one</b></li></ul>'))
            .toBe('<h1>Title</h1><ul><li><b>one</b></li></ul>');
    });

    it('leaves an anchor without href alone', () => {
        expect(withNewTabLinks('<a>Example</a>')).toBe('<a>Example</a>');
    });

    it('returns an empty string for a non-string value', () => {
        expect(withNewTabLinks(null)).toBe('');
        expect(withNewTabLinks(undefined)).toBe('');
        expect(withNewTabLinks(42)).toBe('');
    });
});
