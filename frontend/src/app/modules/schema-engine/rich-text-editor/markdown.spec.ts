import { escapeHtml, htmlToMarkdown, markdownToHtml } from './markdown';

describe('markdown converters', () => {
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

        it('should convert bold and italic', () => {
            expect(markdownToHtml('a **b** c')).toBe('<p>a <b>b</b> c</p>');
            expect(markdownToHtml('a *b* c')).toBe('<p>a <i>b</i> c</p>');
        });

        it('should convert a bullet list', () => {
            expect(markdownToHtml('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
        });

        it('should convert an ordered list', () => {
            expect(markdownToHtml('1. one\n2. two')).toBe('<ol><li>one</li><li>two</li></ol>');
        });

        it('should start a new list when the kind changes', () => {
            expect(markdownToHtml('- one\n1. two'))
                .toBe('<ul><li>one</li></ul><ol><li>two</li></ol>');
        });

        it('should convert a link and mark it to open in a new tab', () => {
            expect(markdownToHtml('[text](https://example.com)'))
                .toBe('<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">text</a></p>');
        });

        it('should leave a link with an unsupported protocol as plain text', () => {
            expect(markdownToHtml('[text](javascript:alert(1))'))
                .toBe('<p>[text](javascript:alert(1))</p>');
        });

        it('should escape characters that are not markup', () => {
            expect(markdownToHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>');
        });

        it('should print an escaped marker as a plain character', () => {
            expect(markdownToHtml('\\*\\*test\\*\\*')).toBe('<p>**test**</p>');
            expect(markdownToHtml('\\# Title')).toBe('<p># Title</p>');
            expect(markdownToHtml('\\- one')).toBe('<p>- one</p>');
            expect(markdownToHtml('1\\. one')).toBe('<p>1. one</p>');
            expect(markdownToHtml('\\[text\\](https://example.com)'))
                .toBe('<p>[text](https://example.com)</p>');
        });

        it('should still format around an escaped marker', () => {
            expect(markdownToHtml('a **b** and \\*c\\*')).toBe('<p>a <b>b</b> and *c*</p>');
        });

        it('should split paragraphs on a blank line', () => {
            expect(markdownToHtml('one\n\ntwo')).toBe('<p>one</p><p>two</p>');
        });
    });

    describe('htmlToMarkdown', () => {
        it('should return an empty string for an empty or null value', () => {
            expect(htmlToMarkdown('')).toBe('');
            expect(htmlToMarkdown(null)).toBe('');
            expect(htmlToMarkdown(undefined)).toBe('');
        });

        it('should convert headings back', () => {
            expect(htmlToMarkdown('<h1>One</h1>')).toBe('# One');
            expect(htmlToMarkdown('<h2>Two</h2>')).toBe('## Two');
            expect(htmlToMarkdown('<h3>Three</h3>')).toBe('### Three');
        });

        it('should convert bold and italic back from both tag spellings', () => {
            expect(htmlToMarkdown('<p>a <b>b</b> c</p>')).toBe('a **b** c');
            expect(htmlToMarkdown('<p>a <strong>b</strong> c</p>')).toBe('a **b** c');
            expect(htmlToMarkdown('<p>a <i>b</i> c</p>')).toBe('a *b* c');
            expect(htmlToMarkdown('<p>a <em>b</em> c</p>')).toBe('a *b* c');
        });

        it('should convert lists back and renumber an ordered list', () => {
            expect(htmlToMarkdown('<ul><li>one</li><li>two</li></ul>')).toBe('- one\n- two');
            expect(htmlToMarkdown('<ol><li>one</li><li>two</li></ol>')).toBe('1. one\n2. two');
        });

        it('should convert a link back', () => {
            expect(htmlToMarkdown('<p><a href="https://example.com">text</a></p>'))
                .toBe('[text](https://example.com)');
        });

        it('should separate blocks with a blank line', () => {
            expect(htmlToMarkdown('<h1>Title</h1><p>text</p>')).toBe('# Title\n\ntext');
        });

        it('should escape typed markers so they stay plain text', () => {
            expect(htmlToMarkdown('<p>**test**</p>')).toBe('\\*\\*test\\*\\*');
            expect(htmlToMarkdown('<p># Title</p>')).toBe('\\# Title');
            expect(htmlToMarkdown('<p>- one</p>')).toBe('\\- one');
            expect(htmlToMarkdown('<p>1. one</p>')).toBe('1\\. one');
            expect(htmlToMarkdown('<p>[text](https://example.com)</p>'))
                .toBe('\\[text\\](https://example.com)');
        });

        it('should escape a marker typed inside a formatted run', () => {
            expect(htmlToMarkdown('<p>a <b>**b**</b> c</p>')).toBe('a **\\*\\*b\\*\\*** c');
        });

        it('should ignore an empty block', () => {
            expect(htmlToMarkdown('<p>one</p><p></p><p>two</p>')).toBe('one\n\ntwo');
        });
    });

    describe('round trips', () => {
        const samples = [
            '# Title',
            'plain text',
            'a **bold** and *italic* line',
            '- one\n- two',
            '1. one\n2. two',
            '[text](https://example.com)',
            '# Title\n\ntext\n\n- one\n- two',
            '\\*\\*test\\*\\*',
            '\\# not a heading',
            '\\- not a list',
            '1\\. not a list',
            'three stars \\*\\*\\* and a hash #',
        ];

        for (const sample of samples) {
            it(`should survive markdown to html and back: ${JSON.stringify(sample)}`, () => {
                expect(htmlToMarkdown(markdownToHtml(sample))).toBe(sample);
            });
        }

        const htmlSamples = [
            '<h1>Title</h1>',
            '<p>plain text</p>',
            '<p>a <b>bold</b> line</p>',
            '<ul><li>one</li><li>two</li></ul>',
            '<ol><li>one</li><li>two</li></ol>',
            '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">text</a></p>',
            '<p>**test**</p>',
            '<p># not a heading</p>',
            '<p>- not a list</p>',
            '<p>1. not a list</p>',
            '<p>a *** b ## c</p>',
        ];

        for (const sample of htmlSamples) {
            it(`should survive html to markdown and back: ${sample}`, () => {
                expect(markdownToHtml(htmlToMarkdown(sample))).toBe(sample);
            });
        }
    });

    describe('escapeHtml', () => {
        it('should escape the three characters that can start markup', () => {
            expect(escapeHtml('<a & b>')).toBe('&lt;a &amp; b&gt;');
        });
    });
});
