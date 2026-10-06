import { collectImageReferences, escapeHtml, markdownToHtml } from './markdown-view';

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

        it('should escape both kinds of quote', () => {
            expect(escapeHtml('he said "hi" and it\'s fine'))
                .toBe('he said &quot;hi&quot; and it&#39;s fine');
        });
    });

    describe('a line break inside a list item', () => {
        it('renders a continuation line as a break inside the same item', () => {
            expect(markdownToHtml('- one\n  two')).toBe('<ul><li>one<br>two</li></ul>');
            expect(markdownToHtml('1. one\n  two')).toBe('<ol><li>one<br>two</li></ol>');
        });

        it('keeps the other items of the list apart', () => {
            expect(markdownToHtml('- one\n  two\n- three'))
                .toBe('<ul><li>one<br>two</li><li>three</li></ul>');
        });
    });

    describe('link urls', () => {
        it('should not let a quoted url add an attribute to the anchor', () => {
            const html = markdownToHtml('[click](https://x"onmouseover="window.__pwned=1)');
            expect(html).toContain('&quot;');
            expect(html).not.toContain('onmouseover="');
        });
    });

    describe('images', () => {
        const reference = 'ipfs://bafkreiabcdef123456';
        const dataUrl = 'data:image/jpg;base64,AAAA';

        it('should render an ipfs image reference as an img, not as text', () => {
            const html = markdownToHtml(`![Site photo](${reference})`);
            expect(html).toContain(`data-src="${reference}"`);
            expect(html).toContain('alt="Site photo"');
            expect(html).not.toContain('![');
        });

        it('should fill src from the resolved map', () => {
            const html = markdownToHtml(`![Site photo](${reference})`, new Map([[reference, dataUrl]]));
            expect(html).toContain(`src="${dataUrl}"`);
        });

        it('should leave src empty when nothing is resolved', () => {
            expect(markdownToHtml(`![a](${reference})`)).toContain('src=""');
        });

        it('should still read a link as a link', () => {
            expect(markdownToHtml('[click](https://example.com)')).toContain('<a href="https://example.com"');
        });

        it('should leave an unsafe target as literal text', () => {
            const html = markdownToHtml('![x](javascript:alert(1))');
            expect(html).not.toContain('<img');
            expect(html).toContain('!');
        });

        it('should collect distinct ipfs references only', () => {
            const other = 'ipfs://bafkreizzzzzz999999';
            expect(collectImageReferences(`![a](${other})\n\n![b](${reference})\n\n![c](${other})`))
                .toEqual([other, reference]);
            expect(collectImageReferences('![a](https://example.com/a.png)')).toEqual([]);
            expect(collectImageReferences(`[a](${reference})`)).toEqual([]);
            expect(collectImageReferences(null)).toEqual([]);
        });

        it('should collect a reference whose alt text holds an escaped bracket', () => {
            expect(collectImageReferences(`![report\\].png](${reference})`)).toEqual([reference]);
            expect(markdownToHtml(`![report\\].png](${reference})`)).toContain(`data-src="${reference}"`);
        });
    });

    describe('nested lists', () => {
        it('should nest an indented bullet list', () => {
            expect(markdownToHtml('- one\n  - deep\n- two'))
                .toBe('<ul><li>one<ul><li>deep</li></ul></li><li>two</li></ul>');
        });

        it('should nest an indented numbered list under a bullet item', () => {
            expect(markdownToHtml('- one\n  1. first\n  2. second'))
                .toBe('<ul><li>one<ol><li>first</li><li>second</li></ol></li></ul>');
        });

        it('should return to the outer level when the indent drops', () => {
            expect(markdownToHtml('- one\n  - deep\n- back'))
                .toBe('<ul><li>one<ul><li>deep</li></ul></li><li>back</li></ul>');
        });

        it('should render three levels', () => {
            expect(markdownToHtml('- one\n  - two\n    - three'))
                .toBe('<ul><li>one<ul><li>two<ul><li>three</li></ul></li></ul></li></ul>');
        });

        it('should keep a deeper continuation line inside its item', () => {
            expect(markdownToHtml('- one\n  - deep\n    more'))
                .toBe('<ul><li>one<ul><li>deep<br>more</li></ul></li></ul>');
        });

        it('should leave a flat list flat', () => {
            expect(markdownToHtml('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
        });
    });

    describe('tables', () => {
        const reference = 'ipfs://bafkreiabcdef123456';

        it('should render a pipe table', () => {
            expect(markdownToHtml('| Name | Size |\n| --- | --- |\n| Apple | Big |'))
                .toBe('<table><thead><tr><th>Name</th><th>Size</th></tr></thead>'
                    + '<tbody><tr><td>Apple</td><td>Big</td></tr></tbody></table>');
        });

        it('should require the divider row', () => {
            expect(markdownToHtml('| a | b |')).toBe('<p>| a | b |</p>');
        });

        it('should pad a row shorter than the header', () => {
            expect(markdownToHtml('| a | b |\n| --- | --- |\n| c |'))
                .toBe('<table><thead><tr><th>a</th><th>b</th></tr></thead>'
                    + '<tbody><tr><td>c</td><td></td></tr></tbody></table>');
        });

        it('should keep markup and an escaped pipe in a cell', () => {
            const rendered = markdownToHtml('| **Bold** | a \\| b |\n| --- | --- |');

            expect(rendered).toContain('<th><b>Bold</b></th>');
            expect(rendered).toContain('<th>a | b</th>');
        });

        it('should keep a paragraph before and after the table', () => {
            expect(markdownToHtml('Before\n\n| a |\n| --- |\n\nAfter'))
                .toBe('<p>Before</p><table><thead><tr><th>a</th></tr></thead></table><p>After</p>');
        });

        it('should resolve a picture inside a cell', () => {
            const resolved = new Map<string, string>([[reference, 'data:image/webp;base64,AAAA']]);

            expect(markdownToHtml(`| ![pic](${reference}) |\n| --- |`, resolved))
                .toContain('src="data:image/webp;base64,AAAA"');
        });
    });
});
