import { escapeHtml, markdownToHtml } from './markdown-view';

describe('markdown-view', () => {

    describe('markdownToHtml', () => {

        it('should return an empty string for an empty or null value', () => {
            expect(markdownToHtml('')).toBe('');
            expect(markdownToHtml(null)).toBe('');
            expect(markdownToHtml(undefined)).toBe('');
        });

        it('should convert the three heading levels', () => {
            expect(markdownToHtml('# One')).toBe('<h1>One</h1>');
            expect(markdownToHtml('## Two')).toBe('<h2>Two</h2>');
            expect(markdownToHtml('### Three')).toBe('<h3>Three</h3>');
        });

        it('should convert bold, italic and both list kinds', () => {
            expect(markdownToHtml('a **b** c')).toBe('<p>a <b>b</b> c</p>');
            expect(markdownToHtml('a *b* c')).toBe('<p>a <i>b</i> c</p>');
            expect(markdownToHtml('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
            expect(markdownToHtml('1. one\n2. two')).toBe('<ol><li>one</li><li>two</li></ol>');
        });

        it('should convert a link and mark it to open in a new tab', () => {
            expect(markdownToHtml('[text](https://example.com)'))
                .toBe('<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">text</a></p>');
        });

        it('should leave a link with an unsupported protocol as plain text', () => {
            expect(markdownToHtml('[text](javascript:alert(1))'))
                .toBe('<p>[text](javascript:alert(1))</p>');
        });

        it('should escape markup that arrives inside the value', () => {
            expect(markdownToHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>');
            expect(markdownToHtml('<script>alert(1)</script>'))
                .toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
        });

        it('should print an escaped marker as a plain character', () => {
            expect(markdownToHtml('\\*\\*test\\*\\*')).toBe('<p>**test**</p>');
            expect(markdownToHtml('\\# Title')).toBe('<p># Title</p>');
            expect(markdownToHtml('\\- one')).toBe('<p>- one</p>');
            expect(markdownToHtml('1\\. one')).toBe('<p>1. one</p>');
        });

        it('should still format around an escaped marker', () => {
            expect(markdownToHtml('a **b** and \\*c\\*')).toBe('<p>a <b>b</b> and *c*</p>');
        });

        it('should split paragraphs on a blank line', () => {
            expect(markdownToHtml('one\n\ntwo')).toBe('<p>one</p><p>two</p>');
        });
    });

    describe('escapeHtml', () => {

        it('should escape the three characters that can start markup', () => {
            expect(escapeHtml('<a & b>')).toBe('&lt;a &amp; b&gt;');
        });
    });
});
