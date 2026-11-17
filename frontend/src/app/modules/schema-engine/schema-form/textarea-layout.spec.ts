import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Textarea } from 'primeng/textarea';
import { IPFSService } from 'src/app/services/ipfs.service';
import { FieldForm } from '../schema-form-model/field-form';
import { SchemaFormComponent } from './schema-form.component';
import { FormTextareaComponent } from './form-textarea/form-textarea.component';

describe('Textarea layout in the request form and the document view', () => {
    const long = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(12);
    const schema = () => new Schema({ iri: '#w&1.0.0', document: {
        $id: '#w&1.0.0', $comment: JSON.stringify({ '@id': 'ctx:#w&1.0.0', term: 'w&1.0.0' }),
        type: SchemaDataTypes.object,
        properties: {
            note: { type: SchemaDataTypes.string, title: 'Note', description: 'Note' },
            tags: { type: SchemaDataTypes.array, title: 'Tags', description: 'Tags', items: { type: SchemaDataTypes.string } },
            rows: { type: SchemaDataTypes.array, title: 'Rows', description: 'Rows', items: { $ref: '#row' } },
        },
        $defs: { '#row': { $id: '#row', type: SchemaDataTypes.object, properties: {
            a: { type: SchemaDataTypes.string, title: 'A', description: 'A' },
            b: { type: SchemaDataTypes.string, title: 'B', description: 'B' },
        } } },
    } } as any);
    const values = { note: long, tags: [long, 'short'], rows: [{ a: long, b: 'x' }, { a: 'y', b: 'z' }] };

    const environment = () => {
        const style = document.createElement('style');
        style.textContent = `
            .guardian-input-container { display: flex; flex-direction: column; width: 100%; }
            textarea, .p-inputtextarea { min-height: 40px !important; padding: 0.5rem 0.5rem !important; max-height: 250px !important; border-radius: 8px !important; overflow: auto !important; }
            .textarea-resize-none { resize: none !important; }`;
        document.head.appendChild(style);
        return style;
    };

    const expectLayout = (root: HTMLElement, rowsAsCells = true, longHeight: number | null = 124) => {
        const textareas: HTMLTextAreaElement[] = Array.from(root.querySelectorAll('textarea'));
        expect(textareas.map((textarea) => textarea.closest('td') ? 'cell' : 'text')).toEqual(['text', 'text', 'text', ...Array(4).fill(rowsAsCells ? 'cell' : 'text')]);
        for (const textarea of textareas) {
            const container = textarea.closest<HTMLElement>('.guardian-input-container');
            expect(textarea.offsetWidth).toBe(container?.clientWidth ?? -1);
            if (textarea.closest('td')) {
                expect(textarea.classList).toContain('textarea-resize-none');
                expect(textarea.offsetHeight).toBe(40);
            } else {
                if (longHeight === null && textarea.value === long) {
                    expect(textarea.offsetHeight).toBeGreaterThan(40);
                } else {
                    expect(textarea.offsetHeight).toBe(textarea.value === long ? longHeight! : 40);
                }
            }
        }
    };

    it('stretches every request-form textarea to its container and grows plain fields with their text', async () => {
        const style = environment();
        TestBed.configureTestingModule({
            declarations: [SchemaFormComponent, FormTextareaComponent],
            imports: [CommonModule, ReactiveFormsModule, TableModule, Textarea],
            providers: [{ provide: IPFSService, useValue: {} }, { provide: DialogService, useValue: {} }],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({ schema: schema(), preset: values, requiredFields: null });
        model.build();
        const fixture = TestBed.createComponent(SchemaFormComponent);
        fixture.componentRef.setInput('form-model', model);
        fixture.componentRef.setInput('showButtons', false);
        fixture.nativeElement.style.display = 'block';
        fixture.nativeElement.style.width = '900px';
        document.body.appendChild(fixture.nativeElement);
        const rows = model.controls!.find((item) => item.name === 'rows')!;
        for (const target of [rows, ...rows.list!]) {
            target.open = true;
        }
        fixture.detectChanges();
        await new Promise((resolve) => setTimeout(resolve, 50));
        fixture.detectChanges();
        expectLayout(fixture.nativeElement, false, null);
        style.remove();
        fixture.nativeElement.remove();
    });
});
