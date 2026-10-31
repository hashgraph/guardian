import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { PopoverModule } from 'primeng/popover';
import { TableModule } from 'primeng/table';
import { Textarea } from 'primeng/textarea';
import { IPFSService } from 'src/app/services/ipfs.service';
import { SchemaFormViewComponent } from './schema-form-view.component';

describe('SchemaFormViewComponent Rich Text table cell', () => {
    const render = (rows: any[], ipfs: any = {}, beforeRender?: (component: SchemaFormViewComponent) => void, extraImports: any[] = []) => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormViewComponent],
            imports: [CommonModule, TableModule, PopoverModule, ...extraImports],
            providers: [
                { provide: IPFSService, useValue: ipfs },
                { provide: DialogService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const schema = new Schema({ iri: '#notes&1.0.0', document: {
            $id: '#notes&1.0.0',
            $comment: JSON.stringify({ '@id': 'ctx:#notes&1.0.0', term: 'notes&1.0.0' }),
            type: SchemaDataTypes.object,
            properties: { rows: { type: SchemaDataTypes.array, items: { $ref: '#row' } } },
            $defs: { '#row': {
                $id: '#row', type: SchemaDataTypes.object,
                properties: {
                    outcome: {
                        type: SchemaDataTypes.string, title: 'Outcome', description: 'Outcome',
                        $comment: JSON.stringify({ term: 'outcome', '@id': 'https://www.schema.org/text', customType: 'richText', orderPosition: 0 }),
                    },
                    comment: {
                        type: SchemaDataTypes.string, title: 'Comment', description: 'Comment',
                        $comment: JSON.stringify({ term: 'comment', '@id': 'https://www.schema.org/text', orderPosition: 1 }),
                    },
                },
            } },
        } } as any);
        const fixture = TestBed.createComponent(SchemaFormViewComponent);
        fixture.componentRef.setInput('schema', schema);
        fixture.componentRef.setInput('values', { rows });
        fixture.componentRef.setInput('dryRun', true);
        beforeRender?.(fixture.componentInstance);
        fixture.detectChanges();
        const component = fixture.componentInstance;
        const cards = (): HTMLElement[] =>
            Array.from(fixture.nativeElement.querySelectorAll('.rich-text-table-card'));
        return { fixture, component, cards };
    };

    const popoverSpy = (overlayVisible = false) => jasmine.createSpyObj('popover', ['show', 'hide', 'align'], { overlayVisible });

    it('renders a card with the formatted preview and a view button', () => {
        const { cards } = render([{ outcome: '## Local community\n\nMet with the **council**' }]);
        expect(cards().length).toBe(1);
        const preview = cards()[0].querySelector('.rich-text-table-preview') as HTMLElement;
        expect(preview.querySelector('h2')?.textContent).toBe('Local community');
        expect(preview.querySelector('b')?.textContent).toBe('council');
        expect(cards()[0].querySelector('.rich-text-table-view')).not.toBeNull();
    });

    it('shows "No text" and no view button for an empty value', () => {
        const { cards } = render([{ comment: 'plain' }]);
        expect(cards()[0].querySelector('.rich-text-table-preview')).toBeNull();
        expect(cards()[0].querySelector('.rich-text-table-empty')?.textContent).toBe('No text');
        expect(cards()[0].querySelector('.rich-text-table-view')).toBeNull();
    });

    it('fills the popover on hover and skips an empty value', () => {
        const { component } = render([{ outcome: 'Some **bold**' }]);
        const popover = popoverSpy();
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), { value: 'Some **bold**' } as any, popover);
        expect(component.richTextPopoverValue).toContain('<b>bold</b>');
        expect(popover.show).toHaveBeenCalledTimes(1);
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), { value: '' } as any, popover);
        expect(popover.show).toHaveBeenCalledTimes(1);
        expect(popover.hide).toHaveBeenCalledTimes(1);
    });

    it('opens a read-only dialog with the rendered value and no editor', () => {
        const { fixture, component, cards } = render([{ outcome: '# Title\n\nBody text' }]);
        (cards()[0].querySelector('.rich-text-table-view') as HTMLElement).click();
        fixture.detectChanges();
        expect(component.richTextDialogField?.value).toBe('# Title\n\nBody text');
        const content = fixture.nativeElement.querySelector('p-dialog .rte-view-content') as HTMLElement;
        expect(content.querySelector('h1')?.textContent).toBe('Title');
        expect(fixture.nativeElement.querySelector('p-dialog app-rich-text-editor')).toBeNull();
        expect(fixture.nativeElement.querySelector('p-dialog [contenteditable="true"]')).toBeNull();
        component.closeRichTextDialog();
        expect(component.richTextDialogField).toBeNull();
    });

    it('shows an empty plain cell instead of the word undefined', () => {
        const { fixture } = render([{ outcome: 'x' }]);
        const textarea = fixture.nativeElement.querySelector('td textarea') as HTMLTextAreaElement;
        expect(textarea.value).toBe('');
    });

    it('resolves an IPFS image in the cell preview', async () => {
        const ipfs = {
            getImageWithDryRunFallback: jasmine.createSpy('getImageWithDryRunFallback').and.resolveTo('blob:resolved-image'),
            getImageFromDryRunStorage: jasmine.createSpy('getImageFromDryRunStorage').and.resolveTo('blob:resolved-image'),
        };
        const { fixture, cards } = render([{ outcome: 'Photo ![site](ipfs://bafyimage)' }], ipfs);
        await new Promise((resolve) => setTimeout(resolve));
        fixture.detectChanges();
        const image = cards()[0].querySelector('.rich-text-table-preview img') as HTMLImageElement;
        expect(image.getAttribute('src')).toBe('blob:resolved-image');
        const calls = ipfs.getImageWithDryRunFallback.calls.count() + ipfs.getImageFromDryRunStorage.calls.count();
        expect(calls).toBe(1);
    });

    it('does not start image loading from the table re-render', () => {
        let host: SchemaFormViewComponent | null = null;
        let depth = 0;
        const read = jasmine.createSpy('read').and.callFake(() => {
            const table = (host?.fields || []).find((field) => field.name === 'rows');
            if (table && depth < 20) {
                depth++;
                host?.getTableHRowFields(table);
            }
            return new Promise(() => undefined);
        });
        const ipfs = { getImageWithDryRunFallback: read, getImageFromDryRunStorage: read };
        const { fixture, component } = render([{ outcome: 'Photo ![site](ipfs://bafyimage)' }], ipfs, (created) => {
            host = created;
        });
        const table = (component.fields || []).find((field) => field.name === 'rows');
        expect(table).toBeDefined();
        for (let index = 0; index < 5 && table; index++) {
            component.getTableHRowFields(table);
            fixture.detectChanges();
        }
        expect(read).toHaveBeenCalledTimes(1);
        expect(depth).toBe(0);
    });

    it('returns the same table rows on every change detection', () => {
        const { component } = render([{ outcome: 'x', comment: 'plain' }]);
        const table = (component.fields || []).find((field) => field.name === 'rows');
        expect(table).toBeDefined();
        if (table) {
            expect(component.getTableHRowFields(table)).toBe(component.getTableHRowFields(table));
        }
    });

    it('renders a table with a PrimeNG textarea without endless re-rendering', () => {
        let error = '';
        try {
            const { fixture } = render([{ outcome: 'x', comment: 'plain' }], {}, undefined, [Textarea]);
            fixture.detectChanges();
            const textarea = fixture.nativeElement.querySelector('td textarea') as HTMLTextAreaElement;
            expect(textarea.value).toBe('plain');
        } catch (caught: any) {
            error = String(caught?.message || caught);
        }
        expect(error).toBe('');
    });

    it('moves an already open popover to the newly hovered cell', () => {
        const { component } = render([{ outcome: 'Some **bold**' }]);
        const closed = popoverSpy(false);
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), { value: 'First' } as any, closed);
        expect(closed.show).toHaveBeenCalledTimes(1);
        expect(closed.align).not.toHaveBeenCalled();
        const open = popoverSpy(true);
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), { value: 'Second' } as any, open);
        expect(open.show).toHaveBeenCalledTimes(1);
        expect(open.align).toHaveBeenCalledTimes(1);
    });
});
