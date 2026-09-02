import { DocumentsSourceBlockComponent } from './documents-source-block.component';

describe('DocumentsSourceBlockComponent', () => {

    function makePopover(): any {
        return {
            shown: [] as any[],
            hidden: 0,
            show(event: any) { this.shown.push(event); },
            hide() { this.hidden++; },
        };
    }

    function createComponent(values: any = {}): any {
        const component: any = Object.create(DocumentsSourceBlockComponent.prototype);
        component.richTextValue = '';
        component.richTextHideTimer = null;
        component.getText = (row: any) => values[row.id] ?? '';
        return component;
    }

    const field: any = { type: 'richText', name: 'note' };

    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('shows the popover with the cell value when the cell has text', () => {
        const component = createComponent({ a: '<p>Hello <a href="https://x.io">link</a></p>' });
        const popover = makePopover();
        const event = new Event('mouseenter');

        component.onRichTextEnter(event, { id: 'a' }, field, popover);

        expect(popover.shown).toEqual([event]);
        expect(component.richTextValue).toContain('target="_blank"');
    });

    it('does not open the popover for a cell that renders no text', () => {
        const component = createComponent({ a: '<p><br></p>' });
        const popover = makePopover();

        component.onRichTextEnter(new Event('mouseenter'), { id: 'a' }, field, popover);

        expect(popover.shown).toEqual([]);
        expect(component.richTextValue).toBe('');
    });

    it('closes the open popover when the pointer moves from a filled cell to an empty one', () => {
        const component = createComponent({ a: '<p>Hello</p>', b: '' });
        const popover = makePopover();

        component.onRichTextEnter(new Event('mouseenter'), { id: 'a' }, field, popover);
        component.onRichTextLeave(popover);
        component.onRichTextEnter(new Event('mouseenter'), { id: 'b' }, field, popover);

        expect(popover.hidden).toBe(0);
        expect(component.richTextValue).toContain('Hello');

        jasmine.clock().tick(250);

        expect(popover.hidden).toBe(1);
    });

    it('keeps the popover open and swaps the value when the pointer moves between filled cells', () => {
        const component = createComponent({ a: '<p>First</p>', b: '<p>Second</p>' });
        const popover = makePopover();

        component.onRichTextEnter(new Event('mouseenter'), { id: 'a' }, field, popover);
        component.onRichTextLeave(popover);
        component.onRichTextEnter(new Event('mouseenter'), { id: 'b' }, field, popover);

        jasmine.clock().tick(250);

        expect(popover.hidden).toBe(0);
        expect(popover.shown.length).toBe(2);
        expect(component.richTextValue).toContain('Second');
    });

    it('keeps the popover open while the pointer is over the popover itself', () => {
        const component = createComponent({ a: '<p>Hello</p>' });
        const popover = makePopover();

        component.onRichTextEnter(new Event('mouseenter'), { id: 'a' }, field, popover);
        component.onRichTextLeave(popover);
        component.onRichTextPopoverEnter();

        jasmine.clock().tick(250);

        expect(popover.hidden).toBe(0);
    });

    it('reads a cell as plain text with the markup removed', () => {
        const component = createComponent({ a: '<p>Line <b>one</b></p><p>two</p>' });

        expect(component.getRichTextCellText({ id: 'a' }, field)).toBe('Line one two');
    });

    describe('a Markdown column', () => {

        const markdownField: any = { type: 'markdown', name: 'note' };

        it('shows the rendered text in the cell, not the syntax', () => {
            const component = createComponent({ a: '# Title\n\nSome **bold** text' });
            const text = component.getRichTextCellText({ id: 'a' }, markdownField);
            expect(text).toContain('Title');
            expect(text).toContain('bold');
            expect(text).not.toContain('#');
            expect(text).not.toContain('**');
        });

        it('renders the value in the popover', () => {
            const component = createComponent({ a: '# Title\n\n- one\n- two' });
            const popover = makePopover();

            component.onRichTextEnter(new Event('mouseenter'), { id: 'a' }, markdownField, popover);

            expect(popover.shown.length).toBe(1);
            expect(component.richTextValue).toContain('<h1>Title</h1>');
            expect(component.richTextValue).toContain('<ul><li>one</li>');
        });

        it('marks a link in the popover for a new tab', () => {
            const component = createComponent({ a: '[text](https://example.com)' });
            const popover = makePopover();

            component.onRichTextEnter(new Event('mouseenter'), { id: 'a' }, markdownField, popover);

            expect(component.richTextValue).toContain('target="_blank"');
            expect(component.richTextValue).toContain('rel="noopener noreferrer"');
        });

        it('opens no popover for an empty value', () => {
            const component = createComponent({ a: '' });
            const popover = makePopover();

            component.onRichTextEnter(new Event('mouseenter'), { id: 'a' }, markdownField, popover);

            expect(popover.shown).toEqual([]);
            expect(component.richTextValue).toBe('');
        });

        it('does not let markup written inside the value become markup', () => {
            const component = createComponent({ a: '<img src="x"> and <b>tags</b>' });
            const popover = makePopover();

            component.onRichTextEnter(new Event('mouseenter'), { id: 'a' }, markdownField, popover);

            expect(component.richTextValue).toContain('&lt;img src="x"&gt;');
            expect(component.richTextValue).not.toContain('<img');
        });

        it('leaves a Rich Text column exactly as it was', () => {
            const component = createComponent({ a: '<h1>Title</h1><p>text</p>' });
            const popover = makePopover();

            component.onRichTextEnter(new Event('mouseenter'), { id: 'a' }, field, popover);

            expect(component.richTextValue).toContain('<h1>Title</h1>');
            expect(component.getRichTextCellText({ id: 'a' }, field)).toBe('Title text');
        });

        it('gives a Markdown cell the same container class as a Rich Text one', () => {
            const component = createComponent();
            expect(component.getClass('markdown')).toBe(component.getClass('richText'));
            expect(component.getClass('markdown')).toBe('text-container');
        });
    });
});
