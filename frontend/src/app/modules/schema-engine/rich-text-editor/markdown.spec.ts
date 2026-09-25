import { collectImageReferences, escapeHtml, htmlToMarkdown, markdownToHtml, splitTableRow } from './markdown';

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


        it('should walk into a wrapper element instead of flattening it', () => {
            const html = '<h2>Must survive</h2><div><h1>One</h1><p>text</p><ul><li>a</li><li>b</li></ul></div>';
            expect(htmlToMarkdown(html)).toBe('## Must survive\n\n# One\n\ntext\n\n- a\n- b');
        });

        it('should walk into nested wrappers', () => {
            const html = '<div><div><h1>One</h1><p>text</p></div></div>';
            expect(htmlToMarkdown(html)).toBe('# One\n\ntext');
        });

        it('should keep a plain div as one paragraph, which is what a typed line is', () => {
            expect(htmlToMarkdown('<div>one line</div><div>another line</div>'))
                .toBe('one line\n\nanother line');
            expect(htmlToMarkdown('<div>a <b>bold</b> line</div>')).toBe('a **bold** line');
        });

        it('should keep a list inside a wrapper as a list', () => {
            expect(htmlToMarkdown('<div><ul><li>one</li><li>two</li></ul></div>')).toBe('- one\n- two');
        });

        it('should ignore an empty block', () => {
            expect(htmlToMarkdown('<p>one</p><p></p><p>two</p>')).toBe('one\n\ntwo');
        });

        it('should keep the formatting of an element that sits at the top level with no block around it', () => {
            expect(htmlToMarkdown('<b>Test</b>')).toBe('**Test**');
            expect(htmlToMarkdown('<i>Test</i>')).toBe('*Test*');
            expect(htmlToMarkdown('<strong>a</strong><em>b</em>')).toBe('**a**\n\n*b*');
        });

        it('should keep a top-level link', () => {
            expect(htmlToMarkdown('<a href="https://example.com">text</a>'))
                .toBe('[text](https://example.com)');
        });

        it('should still drop the wrapper of a top-level block', () => {
            expect(htmlToMarkdown('<p>Test</p>')).toBe('Test');
            expect(htmlToMarkdown('<div>Test</div>')).toBe('Test');
            expect(htmlToMarkdown('<span>Test</span>')).toBe('Test');
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
            'it\'s a "quoted" word',
            '- one\n  two',
            '- one\n  two\n- three',
            '# It\'s a "quoted" heading',
            '- it\'s a "quoted" item',
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

        it('should escape both kinds of quote', () => {
            expect(escapeHtml('he said "hi" and it\'s fine'))
                .toBe('he said &quot;hi&quot; and it&#39;s fine');
        });
    });

    describe('a line break inside a block', () => {
        it('keeps a break in a paragraph, as a new paragraph', () => {
            expect(htmlToMarkdown('<p>one<br>two</p>')).toBe('one\ntwo');
            expect(markdownToHtml('one\ntwo')).toBe('<p>one</p><p>two</p>');
        });

        it('flattens a break inside a heading, because a Markdown heading is one line', () => {
            expect(htmlToMarkdown('<h1>one<br>two</h1>')).toBe('# one two');
            expect(markdownToHtml('# one two')).toBe('<h1>one two</h1>');
        });

        it('keeps a break inside a list item, as a continuation line', () => {
            expect(htmlToMarkdown('<ul><li>one<br>two</li></ul>')).toBe('- one\n  two');
            expect(markdownToHtml('- one\n  two')).toBe('<ul><li>one<br>two</li></ul>');
        });

        it('keeps the items of a list apart when one of them has a break', () => {
            expect(htmlToMarkdown('<ul><li>one<br>two</li><li>three</li></ul>'))
                .toBe('- one\n  two\n- three');
            expect(markdownToHtml('- one\n  two\n- three'))
                .toBe('<ul><li>one<br>two</li><li>three</li></ul>');
        });

        it('keeps the lines apart when the browser wraps the pasted tail in a div', () => {
            const pasted = '<ul><li>one<div>two<br>three</div></li><li>next</li></ul>';
            expect(htmlToMarkdown(pasted)).toBe('- one\n  two\n  three\n- next');
            expect(markdownToHtml('- one\n  two\n  three\n- next'))
                .toBe('<ul><li>one<br>two<br>three</li><li>next</li></ul>');
        });

        it('adds no empty first line when a block opens the list item', () => {
            expect(htmlToMarkdown('<ul><li><p>one</p></li></ul>')).toBe('- one');
            expect(htmlToMarkdown('<ul><li><div>one</div></li></ul>')).toBe('- one');
            expect(markdownToHtml('- one')).toBe('<ul><li>one</li></ul>');
        });

        it('keeps a real leading break at the start of a list item', () => {
            expect(htmlToMarkdown('<ul><li><br>one</li></ul>')).toBe('- \n  one');
            expect(markdownToHtml('- \n  one')).toBe('<ul><li><br>one</li></ul>');
        });

        it('keeps two blocks inside one item as two lines of that item', () => {
            expect(htmlToMarkdown('<ul><li><p>one</p><p>two</p></li></ul>')).toBe('- one\n  two');
            expect(markdownToHtml('- one\n  two')).toBe('<ul><li>one<br>two</li></ul>');
        });

        it('keeps a break in a numbered item too', () => {
            expect(htmlToMarkdown('<ol><li>one<br>two</li></ol>')).toBe('1. one\n  two');
            expect(markdownToHtml('1. one\n  two')).toBe('<ol><li>one<br>two</li></ol>');
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

        it('should turn an ipfs image into an img carrying the reference in data-src', () => {
            expect(markdownToHtml(`![Site photo](${reference})`))
                .toBe(`<p><img src="" data-src="${reference}" alt="Site photo"></p>`);
        });

        it('should keep an empty alt', () => {
            expect(markdownToHtml(`![](${reference})`))
                .toBe(`<p><img src="" data-src="${reference}" alt=""></p>`);
        });

        it('should not read an image as a link', () => {
            const html = markdownToHtml(`![Site photo](${reference})`);
            expect(html).not.toContain('<a ');
            expect(html).not.toContain('!');
        });

        it('should still read a link as a link', () => {
            expect(markdownToHtml('[click](https://example.com)'))
                .toContain('<a href="https://example.com"');
        });

        it('should save the reference from data-src, not the data url in src', () => {
            const html = `<p><img src="data:image/webp;base64,AAAA" data-src="${reference}" alt="Site photo"></p>`;
            const markdown = htmlToMarkdown(html);
            expect(markdown).toBe(`![Site photo](${reference})`);
            expect(markdown).not.toContain('base64');
        });

        it('should fall back to src when there is no data-src', () => {
            expect(htmlToMarkdown('<p><img src="https://example.com/a.png" alt="a"></p>'))
                .toBe('![a](https://example.com/a.png)');
        });

        it('should drop an img with no reference at all', () => {
            expect(htmlToMarkdown('<p><img alt="a"></p>')).toBe('');
        });

        it('should round trip an ipfs image', () => {
            const markdown = `![Site photo](${reference})`;
            expect(htmlToMarkdown(markdownToHtml(markdown))).toBe(markdown);
        });

        it('should leave a javascript target as literal text', () => {
            const html = markdownToHtml('![x](javascript:alert(1))');
            expect(html).not.toContain('<img');
            expect(html).toContain('!');
        });

        it('should keep a closing bracket inside alt from cutting the label short', () => {
            const html = `<p><img src="" data-src="${reference}" alt="a] b"></p>`;
            const markdown = htmlToMarkdown(html);
            expect(markdown).toBe(`![a\\] b](${reference})`);
            expect(htmlToMarkdown(markdownToHtml(markdown))).toBe(markdown);
        });
    });

    describe('resolved images', () => {
        const reference = 'ipfs://bafkreiabcdef123456';
        const other = 'ipfs://bafkreizzzzzz999999';
        const dataUrl = 'data:image/jpg;base64,AAAA';

        it('should leave src empty when no map is passed', () => {
            const html = markdownToHtml(`![Site photo](${reference})`);
            expect(html).toContain('src=""');
            expect(html).toContain(`data-src="${reference}"`);
        });

        it('should fill src from the map', () => {
            const html = markdownToHtml(`![Site photo](${reference})`, new Map([[reference, dataUrl]]));
            expect(html).toContain(`src="${dataUrl}"`);
            expect(html).toContain(`data-src="${reference}"`);
        });

        it('should leave src empty when the map does not hold the reference', () => {
            const html = markdownToHtml(`![Site photo](${reference})`, new Map([[other, dataUrl]]));
            expect(html).toContain('src=""');
        });

        it('should fill images inside headings and list items', () => {
            const resolved = new Map([[reference, dataUrl]]);
            expect(markdownToHtml(`# ![a](${reference})`, resolved)).toContain(`src="${dataUrl}"`);
            expect(markdownToHtml(`- ![a](${reference})`, resolved)).toContain(`src="${dataUrl}"`);
        });

        it('should still prefer the image rule over the link rule on one line', () => {
            const html = markdownToHtml(
                `![a](${reference}) and [b](https://example.com)`,
                new Map([[reference, dataUrl]])
            );
            expect(html).toContain(`<img src="${dataUrl}"`);
            expect(html).toContain('<a href="https://example.com"');
        });
    });

    describe('collectImageReferences', () => {
        const reference = 'ipfs://bafkreiabcdef123456';
        const other = 'ipfs://bafkreizzzzzz999999';

        it('should return an empty list for empty or non-string input', () => {
            expect(collectImageReferences('')).toEqual([]);
            expect(collectImageReferences(null)).toEqual([]);
            expect(collectImageReferences(undefined)).toEqual([]);
            expect(collectImageReferences(42 as any)).toEqual([]);
        });

        it('should return distinct references in order of first appearance', () => {
            const markdown = `![a](${other})\n\ntext\n\n![b](${reference})\n\n![c](${other})`;
            expect(collectImageReferences(markdown)).toEqual([other, reference]);
        });

        it('should ignore a non-ipfs image reference', () => {
            expect(collectImageReferences('![a](https://example.com/a.png)')).toEqual([]);
        });

        it('should ignore an ordinary link to an ipfs target', () => {
            expect(collectImageReferences(`[a](${reference})`)).toEqual([]);
        });

        it('should collect a reference whose alt text holds an escaped bracket', () => {
            expect(collectImageReferences(`![report\\].png](${reference})`)).toEqual([reference]);
        });

        it('should survive the round trip of a filename holding a bracket', () => {
            const html = `<img src="" data-src="${reference}" alt="report].png">`;
            const markdown = htmlToMarkdown(html);

            expect(markdown).toBe(`![report\\].png](${reference})`);
            expect(collectImageReferences(markdown)).toEqual([reference]);

            const resolved = new Map<string, string>([[reference, 'data:image/webp;base64,AAAA']]);
            expect(markdownToHtml(markdown, resolved))
                .toContain('src="data:image/webp;base64,AAAA"');
        });
    });

    describe('nested lists', () => {
        it('should nest an indented bullet list and write it back indented', () => {
            const markdown = '- one\n  - deep\n- two';
            const html = '<ul><li>one<ul><li>deep</li></ul></li><li>two</li></ul>';

            expect(markdownToHtml(markdown)).toBe(html);
            expect(htmlToMarkdown(html)).toBe(markdown);
        });

        it('should nest an indented numbered list under a bullet item', () => {
            const markdown = '- one\n  1. first\n  2. second';
            const html = '<ul><li>one<ol><li>first</li><li>second</li></ol></li></ul>';

            expect(markdownToHtml(markdown)).toBe(html);
            expect(htmlToMarkdown(html)).toBe(markdown);
        });

        it('should return to the outer level when the indent drops', () => {
            const markdown = '- one\n  - deep\n- back';

            expect(markdownToHtml(markdown))
                .toBe('<ul><li>one<ul><li>deep</li></ul></li><li>back</li></ul>');
        });

        it('should round trip three levels', () => {
            const markdown = '- one\n  - two\n    - three\n- back';
            const html = '<ul><li>one<ul><li>two<ul><li>three</li></ul></li></ul></li>'
                + '<li>back</li></ul>';

            expect(markdownToHtml(markdown)).toBe(html);
            expect(htmlToMarkdown(html)).toBe(markdown);
        });

        it('should number every nested ordered list from one', () => {
            const html = '<ol><li>one<ol><li>a</li><li>b</li></ol></li><li>two<ol><li>c</li></ol></li></ol>';

            expect(htmlToMarkdown(html)).toBe('1. one\n  1. a\n  2. b\n2. two\n  1. c');
        });

        it('should indent a continuation line of a nested item one level deeper', () => {
            const markdown = '- one\n  - deep\n    more';

            expect(markdownToHtml(markdown))
                .toBe('<ul><li>one<ul><li>deep<br>more</li></ul></li></ul>');
            expect(htmlToMarkdown('<ul><li>one<ul><li>deep<br>more</li></ul></li></ul>'))
                .toBe(markdown);
        });

        it('should read a nested list left beside the item as nesting', () => {
            expect(htmlToMarkdown('<ul><li>one</li><ul><li>deep</li></ul><li>two</li></ul>'))
                .toBe('- one\n  - deep\n- two');
        });

        it('should clamp an over indented item to one level deeper', () => {
            expect(markdownToHtml('- one\n      - deep'))
                .toBe('<ul><li>one<ul><li>deep</li></ul></li></ul>');
        });

        it('should leave a flat list flat in both directions', () => {
            const markdown = '- one\n- two';
            const html = '<ul><li>one</li><li>two</li></ul>';

            expect(markdownToHtml(markdown)).toBe(html);
            expect(htmlToMarkdown(html)).toBe(markdown);
        });

        it('should no longer print an indented marker inside the item above', () => {
            const html = markdownToHtml('- one\n  - deep');

            expect(html).not.toContain('<br>- deep');
            expect(html).toContain('<ul><li>deep</li></ul>');
        });
    });
    describe('tables', () => {
        const markdown = '| Name | Size |\n| --- | --- |\n| Apple | Big |';
        const html = '<table><thead><tr><th>Name</th><th>Size</th></tr></thead>'
            + '<tbody><tr><td>Apple</td><td>Big</td></tr></tbody></table>';

        it('should round trip a two column table', () => {
            expect(markdownToHtml(markdown)).toBe(html);
            expect(htmlToMarkdown(html)).toBe(markdown);
        });

        it('should leave a pipe row with no divider as a paragraph', () => {
            expect(markdownToHtml('| a | b |'))
                .toBe('<p>| a | b |</p>');
        });

        it('should accept an aligned divider and drop the alignment', () => {
            expect(markdownToHtml('| a | b |\n| :--- | ---: |\n| c | d |'))
                .toBe('<table><thead><tr><th>a</th><th>b</th></tr></thead>'
                    + '<tbody><tr><td>c</td><td>d</td></tr></tbody></table>');
        });

        it('should render a header with no body row', () => {
            expect(markdownToHtml('| a | b |\n| --- | --- |'))
                .toBe('<table><thead><tr><th>a</th><th>b</th></tr></thead></table>');
        });

        it('should pad a row shorter than the header', () => {
            expect(markdownToHtml('| a | b |\n| --- | --- |\n| c |'))
                .toBe('<table><thead><tr><th>a</th><th>b</th></tr></thead>'
                    + '<tbody><tr><td>c</td><td></td></tr></tbody></table>');
        });

        it('should keep markup and a link inside a cell', () => {
            const source = '| **Bold** | [site](https://example.com) |\n| --- | --- |';
            const rendered = markdownToHtml(source);

            expect(rendered).toContain('<th><b>Bold</b></th>');
            expect(rendered).toContain('href="https://example.com"');
        });

        it('should escape a pipe inside cell text and read it back', () => {
            const source = '| a \\| b | c |\n| --- | --- |';

            expect(splitTableRow('| a \\| b | c |')).toEqual(['a | b', 'c']);
            expect(markdownToHtml(source)).toContain('<th>a | b</th>');
            expect(htmlToMarkdown('<table><tr><th>a | b</th><th>c</th></tr></table>')).toBe(source);
        });

        it('should flatten a line break inside a cell', () => {
            expect(htmlToMarkdown('<table><tr><td>one<br>two</td><td>c</td></tr></table>'))
                .toBe('| one two | c |\n| --- | --- |');
        });

        it('should read rows that have no thead or tbody', () => {
            expect(htmlToMarkdown('<table><tr><th>a</th></tr><tr><td>b</td></tr></table>'))
                .toBe('| a |\n| --- |\n| b |');
        });

        it('should keep an empty cell', () => {
            expect(htmlToMarkdown('<table><tr><th>a</th><th></th></tr></table>'))
                .toBe('| a |  |\n| --- | --- |');
        });

        it('should drop a table with no cells', () => {
            expect(htmlToMarkdown('<table></table>')).toBe('');
        });

        it('should keep a paragraph before and after the table', () => {
            expect(markdownToHtml('Before\n\n' + markdown + '\n\nAfter'))
                .toBe('<p>Before</p>' + html + '<p>After</p>');
            expect(htmlToMarkdown('<p>Before</p>' + html + '<p>After</p>'))
                .toBe('Before\n\n' + markdown + '\n\nAfter');
        });

        it('should not read a table row starting with a dash as a list item', () => {
            expect(markdownToHtml('| - one | b |\n| --- | --- |'))
                .toBe('<table><thead><tr><th>- one</th><th>b</th></tr></thead></table>');
        });
    });
});
