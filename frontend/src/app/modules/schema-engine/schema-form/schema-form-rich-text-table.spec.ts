import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { PopoverModule } from 'primeng/popover';
import { TableModule } from 'primeng/table';
import { IPFSService } from 'src/app/services/ipfs.service';
import { FieldForm } from '../schema-form-model/field-form';
import { SchemaFormComponent } from './schema-form.component';
import { FormTextareaComponent } from './form-textarea/form-textarea.component';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';

describe('SchemaFormComponent Rich Text table cell', () => {
    const render = (ipfs: any = {}, outcome = '# Title\n\nSome **bold** text') => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormComponent, FormTextareaComponent, RichTextEditorComponent],
            imports: [CommonModule, ReactiveFormsModule, TableModule, PopoverModule],
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
        } });
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({ schema, preset: { rows: [{ outcome }, {}] } });
        model.build();
        const fixture = TestBed.createComponent(SchemaFormComponent);
        fixture.componentRef.setInput('form-model', model);
        fixture.componentRef.setInput('showButtons', false);
        fixture.detectChanges();
        const filled = model.controls![0].list![0].model.controls[0];
        const empty = model.controls![0].list![1].model.controls[0];
        const component = fixture.componentInstance;
        const cards = (): HTMLElement[] =>
            Array.from(fixture.nativeElement.querySelectorAll('.rich-text-table-card'));
        return { fixture, component, filled, empty, cards };
    };

    const popoverSpy = (overlayVisible = false) => jasmine.createSpyObj('popover', ['show', 'hide', 'align'], { overlayVisible });

    it('renders a card with the formatted preview of the stored Markdown', () => {
        const { cards } = render();
        expect(cards().length).toBe(2);
        const preview = cards()[0].querySelector('.rich-text-table-preview') as HTMLElement;
        expect(preview.querySelector('h1')?.textContent).toBe('Title');
        expect(preview.querySelector('b')?.textContent).toBe('bold');
        expect(cards()[0].querySelector('.rich-text-table-edit')).not.toBeNull();
        expect(cards()[0].querySelector('.rich-text-table-clear')).not.toBeNull();
    });

    it('shows the pencil hint and no clear button for an empty value', () => {
        const { cards } = render();
        expect(cards()[1].querySelector('.rich-text-table-preview')).toBeNull();
        expect(cards()[1].querySelector('.rich-text-table-empty')?.textContent).toBe('Use the pencil to write text');
        expect(cards()[1].querySelector('.rich-text-table-clear')).toBeNull();
        expect(cards()[1].classList.contains('rich-text-table-card--no-clear')).toBeTrue();
    });

    it('fills the popover with formatted HTML on hover and skips an empty value', () => {
        const { component, filled, empty } = render();
        const popover = popoverSpy();
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), filled, popover);
        expect(component.suggestPopoverValue).toContain('<b>bold</b>');
        expect(popover.show).toHaveBeenCalledTimes(1);
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), empty, popover);
        expect(popover.show).toHaveBeenCalledTimes(1);
        expect(popover.hide).toHaveBeenCalledTimes(1);
    });

    it('opens the dialog for the clicked cell and hides the popover', () => {
        const { component, filled } = render();
        const popover = popoverSpy();
        component.openRichTextDialog(filled, popover);
        expect(popover.hide).toHaveBeenCalled();
        expect(component.richTextDialogControl).toBe(filled);
    });

    it('opens the dialog from a click on the pencil', () => {
        const { fixture, component, filled, cards } = render();
        (cards()[0].querySelector('.rich-text-table-edit') as HTMLElement).click();
        fixture.detectChanges();
        expect(component.richTextDialogControl).toBe(filled);
    });

    it('keeps the dialog open while the editor link popover is open', () => {
        const { component, filled } = render();
        component.openRichTextDialog(filled, popoverSpy());
        const editor = jasmine.createSpyObj('editor', ['cancelLink'], { showLinkDialog: true, imageLoading: false });
        component.richTextDialogEditor = editor;
        expect(component.isRichTextDialogBusy()).toBeTrue();
        component.closeRichTextDialog();
        expect(component.richTextDialogControl).toBe(filled);
        expect(editor.cancelLink).not.toHaveBeenCalled();
    });

    it('closes the dialog and drops the pending link when the editor is idle', () => {
        const { component, filled } = render();
        component.openRichTextDialog(filled, popoverSpy());
        const editor = jasmine.createSpyObj('editor', ['cancelLink'], { showLinkDialog: false, imageLoading: false });
        component.richTextDialogEditor = editor;
        component.closeRichTextDialog();
        expect(editor.cancelLink).toHaveBeenCalled();
        expect(component.richTextDialogControl).toBeNull();
    });

    it('shows the new value in the cell after the control value changes', () => {
        const { fixture, filled, cards } = render();
        filled.control.setValue('Updated *value*');
        fixture.detectChanges();
        const preview = cards()[0].querySelector('.rich-text-table-preview') as HTMLElement;
        expect(preview.textContent?.trim()).toBe('Updated value');
        expect(preview.querySelector('i')?.textContent).toBe('value');
    });

    it('clears the value from the clear button', () => {
        const { fixture, filled, cards } = render();
        (cards()[0].querySelector('.rich-text-table-clear') as HTMLElement).click();
        fixture.detectChanges();
        expect(filled.control.value).toBe('');
        expect(filled.control.dirty).toBeTrue();
        expect(cards()[0].querySelector('.rich-text-table-empty')).not.toBeNull();
    });

    it('resolves an IPFS image in the cell preview and in the hover popover', async () => {
        const ipfs = jasmine.createSpyObj('ipfs', ['getImageWithDryRunFallback']);
        ipfs.getImageWithDryRunFallback.and.resolveTo('blob:resolved-image');
        const { fixture, component, filled, cards } = render(ipfs, 'Photo ![site](ipfs://bafyimage)');
        await new Promise((resolve) => setTimeout(resolve));
        fixture.detectChanges();
        const image = cards()[0].querySelector('.rich-text-table-preview img') as HTMLImageElement;
        expect(image.getAttribute('src')).toBe('blob:resolved-image');
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), filled, popoverSpy());
        expect(component.suggestPopoverValue).toContain('src="blob:resolved-image"');
        expect(ipfs.getImageWithDryRunFallback).toHaveBeenCalledTimes(1);
    });

    it('keeps the plain string column on its textarea', () => {
        const { fixture } = render();
        const cells = fixture.nativeElement.querySelectorAll('tbody tr:first-child td');
        const commentCell = Array.from(cells).find((cell: any) => cell.querySelector('textarea')) as HTMLElement;
        expect(commentCell).toBeTruthy();
        expect(commentCell.querySelector('.rich-text-table-card')).toBeNull();
    });

    it('moves an already open popover to the newly hovered cell', () => {
        const { component, filled } = render();
        const closed = popoverSpy(false);
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), filled, closed);
        expect(closed.show).toHaveBeenCalledTimes(1);
        expect(closed.align).not.toHaveBeenCalled();
        const open = popoverSpy(true);
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), filled, open);
        expect(open.show).toHaveBeenCalledTimes(1);
        expect(open.align).toHaveBeenCalledTimes(1);
    });

    it('restores the previous value when the dialog is cancelled', () => {
        const { component, filled } = render();
        component.openRichTextDialog(filled, popoverSpy());
        filled.control.setValue('Typed in the dialog');
        component.cancelRichTextDialog();
        expect(filled.control.value).toBe('# Title\n\nSome **bold** text');
        expect(component.richTextDialogControl).toBeNull();
    });

    it('keeps the new value on Done and ignores the hide event that follows', () => {
        const { component, filled } = render();
        component.openRichTextDialog(filled, popoverSpy());
        filled.control.setValue('Saved with Done');
        component.closeRichTextDialog();
        component.cancelRichTextDialog();
        expect(filled.control.value).toBe('Saved with Done');
    });

    it('shows an eye labelled View on a cell that cannot be edited', () => {
        const { fixture, component, filled, cards } = render();
        filled.isUpdatable = false;
        component.isEditMode = true;
        fixture.componentRef.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        const button = cards()[0].querySelector('.rich-text-table-edit') as HTMLElement;
        expect(button.getAttribute('title')).toBe('View Outcome');
        expect(button.querySelector('i')?.className).toContain('pi-eye');
        expect(cards()[0].querySelector('.rich-text-table-clear')).toBeNull();
        expect(getComputedStyle(cards()[0]).pointerEvents).not.toBe('none');
        expect(getComputedStyle(button).pointerEvents).not.toBe('none');
    });

    it('fetches an image only once while the first request is still pending', async () => {
        const ipfs = jasmine.createSpyObj('ipfs', ['getImageWithDryRunFallback']);
        ipfs.getImageWithDryRunFallback.and.returnValue(new Promise(() => undefined));
        const { fixture, component, filled } = render(ipfs, 'Photo ![site](ipfs://bafyimage)');
        filled.control.setValue('Photo ![site](ipfs://bafyimage) more');
        filled.control.setValue('Photo ![site](ipfs://bafyimage) more text');
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), filled, popoverSpy());
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), filled, popoverSpy());
        await new Promise((resolve) => setTimeout(resolve));
        fixture.detectChanges();
        expect(ipfs.getImageWithDryRunFallback).toHaveBeenCalledTimes(1);
    });

    it('retries an image after a failed fetch', async () => {
        const ipfs = jasmine.createSpyObj('ipfs', ['getImageWithDryRunFallback']);
        ipfs.getImageWithDryRunFallback.and.returnValues(Promise.reject(new Error('offline')), Promise.resolve('blob:second-try'));
        const { fixture, component, filled, cards } = render(ipfs, 'Photo ![site](ipfs://bafyimage)');
        await new Promise((resolve) => setTimeout(resolve));
        fixture.detectChanges();
        expect(cards()[0].querySelector('.rich-text-table-preview img')?.getAttribute('src')).toBe('');
        component.onRichTextCellEnter(new MouseEvent('mouseenter'), filled, popoverSpy());
        await new Promise((resolve) => setTimeout(resolve));
        fixture.detectChanges();
        expect(ipfs.getImageWithDryRunFallback).toHaveBeenCalledTimes(2);
        expect(component.suggestPopoverValue).toContain('src="blob:second-try"');
    });
});
