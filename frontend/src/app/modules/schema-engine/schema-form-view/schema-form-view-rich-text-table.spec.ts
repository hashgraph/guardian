import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { PopoverModule } from 'primeng/popover';
import { BehaviorSubject } from 'rxjs';
import { IPFSService } from 'src/app/services/ipfs.service';
import { SchemaFormPreferencesService } from 'src/app/services/schema-form-preferences.service';
import { SchemaFormViewComponent } from './schema-form-view.component';

describe('SchemaFormViewComponent Rich Text in a record row', () => {
    const render = (rows: any[], ipfs: any = {}) => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormViewComponent],
            imports: [CommonModule, PopoverModule],
            providers: [
                { provide: IPFSService, useValue: ipfs },
                { provide: DialogService, useValue: {} },
                { provide: SchemaFormPreferencesService, useValue: { showFieldMetadata$: new BehaviorSubject(false) } },
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
        fixture.detectChanges();
        (fixture.nativeElement.querySelector('.sf-record-toggle') as HTMLElement).click();
        fixture.detectChanges();
        const component = fixture.debugElement.children[0]?.componentInstance as SchemaFormViewComponent
            ?? fixture.componentInstance;
        const rich = (): HTMLElement | null => fixture.nativeElement.querySelector('.sf-record-body .sf-ro-rt');
        return { fixture, component: fixture.componentInstance, rich };
    };

    const popoverSpy = (overlayVisible = false) => ({
        show: vi.fn().mockName("popover.show"),
        hide: vi.fn().mockName("popover.hide"),
        align: vi.fn().mockName("popover.align"),
        overlayVisible
    });

    it('renders the formatted text clamped, with a Show more control', () => {
        const { rich, fixture } = render([{ outcome: '## Local community\n\nMet with the **council**' }]);
        expect(rich()!.querySelector('h2')?.textContent).toBe('Local community');
        expect(rich()!.querySelector('b')?.textContent).toBe('council');
        const more = fixture.nativeElement.querySelector('.sf-record-body .sf-ro-more') as HTMLElement;
        more.click();
        fixture.detectChanges();
        expect(rich()!.classList).toContain('open');
        expect(more.textContent!.trim()).toBe('Show less');
    });

    it('shows "Not provided" for an empty rich text', () => {
        const { fixture } = render([{ comment: 'plain' }]);
        expect(fixture.nativeElement.querySelector('.sf-record-body .sf-empty')?.textContent).toBe('Not provided');
        expect(fixture.nativeElement.querySelector('.sf-record-body .sf-ro-rt')).toBeNull();
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
        const { fixture, component } = render([{ outcome: '# Title\n\nBody text' }]);
        const view = fixture.debugElement.query(({ componentInstance }) => componentInstance instanceof SchemaFormViewComponent && componentInstance.inRecord);
        const row = view.componentInstance as SchemaFormViewComponent;
        const button = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.sf-record-body .sf-ro-rt-actions button'))
            .find((node) => node.textContent!.trim() === 'View')!;
        button.click();
        fixture.detectChanges();
        expect(row.richTextDialogField?.value).toBe('# Title\n\nBody text');
        row.closeRichTextDialog();
        expect(row.richTextDialogField).toBeNull();
        expect(component.richTextDialogField).toBeNull();
    });

    it('resolves an IPFS image in the record row', async () => {
        const ipfs = {
            getImageWithDryRunFallback: vi.fn().mockResolvedValue('blob:resolved-image'),
            getImageFromDryRunStorage: vi.fn().mockResolvedValue('blob:resolved-image'),
        };
        const { fixture, rich } = render([{ outcome: 'Photo ![site](ipfs://bafyimage)' }], ipfs);
        await new Promise((resolve) => setTimeout(resolve));
        fixture.detectChanges();
        const image = rich()!.querySelector('img') as HTMLImageElement;
        expect(image.getAttribute('src')).toBe('blob:resolved-image');
        const calls = vi.mocked(ipfs.getImageWithDryRunFallback).mock.calls.length + vi.mocked(ipfs.getImageFromDryRunStorage).mock.calls.length;
        expect(calls).toBe(1);
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
