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
        component.documents = Object.keys(values).map((id) => ({ id }));
        component.buildRichTextCellText([field]);
        return component;
    }

    function row(component: any, id: string): any {
        return component.documents.find((item: any) => item.id === id);
    }

    const field: any = { type: 'richText', name: 'note', index: '0' };

    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('shows the popover with the cell value when the cell has text', () => {
        const component = createComponent({ a: 'Hello [link](https://x.io)' });
        const popover = makePopover();
        const event = new Event('mouseenter');

        component.onRichTextEnter(event, row(component, 'a'), field, popover);

        expect(popover.shown).toEqual([event]);
        expect(component.richTextValue).toContain('target="_blank"');
    });

    it('does not open the popover for a cell that renders no text', () => {
        const component = createComponent({ a: '   ' });
        const popover = makePopover();

        component.onRichTextEnter(new Event('mouseenter'), row(component, 'a'), field, popover);

        expect(popover.shown).toEqual([]);
        expect(component.richTextValue).toBe('');
    });

    it('closes the open popover when the pointer moves from a filled cell to an empty one', () => {
        const component = createComponent({ a: 'Hello', b: '' });
        const popover = makePopover();

        component.onRichTextEnter(new Event('mouseenter'), row(component, 'a'), field, popover);
        component.onRichTextLeave(popover);
        component.onRichTextEnter(new Event('mouseenter'), row(component, 'b'), field, popover);

        expect(popover.hidden).toBe(0);
        expect(component.richTextValue).toContain('Hello');

        jasmine.clock().tick(250);

        expect(popover.hidden).toBe(1);
    });

    it('keeps the popover open and swaps the value when the pointer moves between filled cells', () => {
        const component = createComponent({ a: 'First', b: 'Second' });
        const popover = makePopover();

        component.onRichTextEnter(new Event('mouseenter'), row(component, 'a'), field, popover);
        component.onRichTextLeave(popover);
        component.onRichTextEnter(new Event('mouseenter'), row(component, 'b'), field, popover);

        jasmine.clock().tick(250);

        expect(popover.hidden).toBe(0);
        expect(popover.shown.length).toBe(2);
        expect(component.richTextValue).toContain('Second');
    });

    it('keeps the popover open while the pointer is over the popover itself', () => {
        const component = createComponent({ a: 'Hello' });
        const popover = makePopover();

        component.onRichTextEnter(new Event('mouseenter'), row(component, 'a'), field, popover);
        component.onRichTextLeave(popover);
        component.onRichTextPopoverEnter();

        jasmine.clock().tick(250);

        expect(popover.hidden).toBe(0);
    });

    it('reads a cell as plain text with the markup removed', () => {
        const component = createComponent({ a: 'Line **one**\n\ntwo' });

        expect(component.getRichTextCellText(row(component, 'a'), field)).toBe('Line one two');
    });

    it('builds the cell text when the rows are set, not when the cell is read', () => {
        const component = createComponent({ a: '# Title\n\nSome **bold** text' });

        expect(row(component, 'a')._richTextCellText[field.index]).toBe('Title Some bold text');
    });

    it('reads the new text after the rows are built again', () => {
        const values: any = { a: 'First' };
        const component: any = Object.create(DocumentsSourceBlockComponent.prototype);
        component.getText = (item: any) => values[item.id];
        component.documents = [{ id: 'a' }];
        component.buildRichTextCellText([field]);

        expect(component.getRichTextCellText(component.documents[0], field)).toBe('First');

        values.a = 'Second';
        component.buildRichTextCellText([field]);

        expect(component.getRichTextCellText(component.documents[0], field)).toBe('Second');
    });

    it('reads a row with no built text as an empty cell', () => {
        const component = createComponent();

        expect(component.getRichTextCellText({ id: 'z' }, field)).toBe('');
    });

    it('covers the grouped field a row selects, not only the first of its group', async () => {
        const component: any = Object.create(DocumentsSourceBlockComponent.prototype);
        component.sortOptions = {};

        await component.setData({
            fields: [
                { title: 'Notes', name: 'noteA', type: 'richText', bindGroup: 'sourceA' },
                { title: 'Notes', name: 'noteB', type: 'richText', bindGroup: 'sourceB' },
            ],
            data: [{ __sourceTag__: 'sourceB', noteB: '# From B' }],
            commonAddons: [],
        });

        const selected = component.getGroup(component.documents[0], component.fields[0]);

        expect(selected.name).toBe('noteB');
        expect(component.getRichTextCellText(component.documents[0], selected)).toBe('From B');
    });

    describe('a Rich Text column', () => {

        it('shows the rendered text in the cell, not the syntax', () => {
            const component = createComponent({ a: '# Title\n\nSome **bold** text' });
            const text = component.getRichTextCellText(row(component, 'a'), field);
            expect(text).toContain('Title');
            expect(text).toContain('bold');
            expect(text).not.toContain('#');
            expect(text).not.toContain('**');
        });

        it('renders the value in the popover', () => {
            const component = createComponent({ a: '# Title\n\n- one\n- two' });
            const popover = makePopover();

            component.onRichTextEnter(new Event('mouseenter'), row(component, 'a'), field, popover);

            expect(popover.shown.length).toBe(1);
            expect(component.richTextValue).toContain('<h1>Title</h1>');
            expect(component.richTextValue).toContain('<ul><li>one</li>');
        });

        it('marks a link in the popover for a new tab', () => {
            const component = createComponent({ a: '[text](https://example.com)' });
            const popover = makePopover();

            component.onRichTextEnter(new Event('mouseenter'), row(component, 'a'), field, popover);

            expect(component.richTextValue).toContain('target="_blank"');
            expect(component.richTextValue).toContain('rel="noopener noreferrer"');
        });

        it('opens no popover for an empty value', () => {
            const component = createComponent({ a: '' });
            const popover = makePopover();

            component.onRichTextEnter(new Event('mouseenter'), row(component, 'a'), field, popover);

            expect(popover.shown).toEqual([]);
            expect(component.richTextValue).toBe('');
        });

        it('does not let markup written inside the value become markup', () => {
            const component = createComponent({ a: '<img src="x"> and <b>tags</b>' });
            const popover = makePopover();

            component.onRichTextEnter(new Event('mouseenter'), row(component, 'a'), field, popover);

            expect(component.richTextValue).toContain('&lt;img src="x"&gt;');
            expect(component.richTextValue).not.toContain('<img');
        });

        it('gives a Rich Text cell the text container class', () => {
            const component = createComponent();
            expect(component.getClass('richText')).toBe('text-container');
        });

        it('no longer knows a markdown column type', () => {
            const component = createComponent();
            expect(component.getClass('markdown')).not.toBe('text-container');
        });
    });
});
