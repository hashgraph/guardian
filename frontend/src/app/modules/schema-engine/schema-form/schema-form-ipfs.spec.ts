import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { IPFSService } from 'src/app/services/ipfs.service';
import { ToastService } from 'src/app/services/toast.service';
import { CopyButtonComponent } from '../../common/copy-button/copy-button.component';
import { IPFSLinkComponent } from '../../common/ipfs-link/ipfs-link.component';
import { FieldForm } from '../schema-form-model/field-form';
import { FormTextareaComponent } from './form-textarea/form-textarea.component';
import { SchemaFormComponent } from './schema-form.component';

describe('SchemaFormComponent IPFS actions', () => {
    const value = 'ipfs://6af6e8ec63af3cd1188591c0';
    const render = (fixture: ComponentFixture<SchemaFormComponent>) => {
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
    };
    const build = (array: boolean, pattern = '^ipfs://.+', lockedValue?: string) => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormComponent, FormTextareaComponent, IPFSLinkComponent, CopyButtonComponent],
            imports: [CommonModule, ReactiveFormsModule],
            providers: [
                { provide: IPFSService, useValue: {} },
                { provide: ToastService, useValue: {} },
                { provide: DialogService, useValue: {} },
                { provide: Clipboard, useValue: { copy: () => true } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const scalar = { type: SchemaDataTypes.string, title: 'File', description: 'File', pattern };
        const document = {
            $id: '#files&1.0.0',
            $comment: JSON.stringify({ '@id': 'ctx:#files&1.0.0', term: 'files&1.0.0' }),
            type: SchemaDataTypes.object,
            properties: { file: array ? { type: SchemaDataTypes.array, title: 'Files', description: 'Files', items: scalar } : scalar },
        };
        const model = new FieldForm(new UntypedFormGroup({}));
        model.setData({
            schema: new Schema({ iri: '#files&1.0.0', document }),
            readonlyFields: lockedValue === undefined ? undefined : [{ name: 'file' }],
            preset: lockedValue === undefined ? undefined : { file: lockedValue },
        });
        model.build();
        const field = model.controls![0];
        if (array) {
            model.addItem(field);
            model.addItem(field);
        }
        const entry = array ? field.list![0] : field;
        const fixture = TestBed.createComponent(SchemaFormComponent);
        fixture.componentRef.setInput('form-model', model);
        fixture.componentRef.setInput('showButtons', false);
        render(fixture);
        const actions = () => fixture.debugElement.queryAll(By.directive(IPFSLinkComponent));
        return { fixture, field, entry, actions };
    };

    for (const array of [false, true]) {
        describe(array ? 'array fields' : 'single fields', () => {
            it('shows actions with a value, hides them when cleared and restores them afterwards', () => {
                const { fixture, entry, actions } = build(array);
                expect(actions().length).toBe(0);
                entry.control.setValue(value);
                render(fixture);
                expect(actions().length).toBe(1);
                expect(actions()[0].componentInstance.url).toBe(value);
                expect(actions()[0].nativeElement.querySelector('a').textContent).toContain('Open');
                expect(actions()[0].nativeElement.querySelector('button[aria-label="Copy CID"]').disabled).toBeTrue();
                entry.control.setValue('');
                render(fixture);
                expect(actions().length).toBe(0);
                entry.control.setValue(value);
                render(fixture);
                expect(actions().length).toBe(1);
            });

            it('hides actions during upload and restores them when it finishes', () => {
                const { fixture, entry, actions } = build(array);
                entry.control.setValue(value);
                render(fixture);
                expect(actions().length).toBe(1);
                entry.fileUploading = true;
                render(fixture);
                expect(actions().length).toBe(0);
                entry.fileUploading = false;
                render(fixture);
                expect(actions().length).toBe(1);
            });

            for (const [dryRun, policyId, expected] of [[true, 'policy', true], [true, '', false], [false, 'policy', false], [false, '', false]] as const) {
                it(`uses dry-run storage only with dryRun=${dryRun} and policyId=${policyId}`, () => {
                    const { fixture, entry, actions } = build(array);
                    entry.control.setValue(value);
                    fixture.componentRef.setInput('dryRun', dryRun);
                    fixture.componentRef.setInput('policyId', policyId);
                    render(fixture);
                    expect(actions().length).toBe(1);
                    expect(actions()[0].componentInstance.dryRun).toBe(expected);
                });
            }

            it('does not add actions to an ordinary text field', () => {
                const { fixture, entry, actions } = build(array, '');
                entry.control.setValue(value);
                render(fixture);
                expect(actions().length).toBe(0);
            });
        });
    }

    describe('locked single fields', () => {
        const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';

        for (const [dryRun, policyId, expected] of [[true, 'policy', true], [true, '', false], [false, 'policy', false], [false, '', false]] as const) {
            it(`shows shared file actions with dryRun=${dryRun} and policyId=${policyId}`, fakeAsync(() => {
                const url = `ipfs://${cid}`;
                const { fixture, field, actions } = build(false, '^ipfs://.+', url);
                fixture.componentRef.setInput('dryRun', dryRun);
                fixture.componentRef.setInput('policyId', policyId);
                tick();
                render(fixture);
                const row: HTMLElement = fixture.nativeElement.querySelector('.sf-lock');
                expect(field.control.disabled).toBeTrue();
                expect(row.querySelector('.pi-lock')).not.toBeNull();
                expect(row.querySelector('code')?.textContent).toBe(url);
                expect(actions().length).toBe(1);
                expect(actions()[0].componentInstance.url).toBe(url);
                expect(actions()[0].componentInstance.dryRun).toBe(expected);
                expect(row.querySelector('a')?.getAttribute('href')).toBe(`https://ipfs.io/ipfs/${cid}`);
                expect(Array.from(row.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))).toEqual(['Copy link', 'Copy CID']);
                expect(row.querySelector<HTMLButtonElement>('button[aria-label="Copy CID"]')?.disabled).toBeFalse();
            }));
        }

        it('keeps the CID disabled for a locked dry-run database file', fakeAsync(() => {
            const { fixture, field, actions } = build(false, '^ipfs://.+', value);
            fixture.componentRef.setInput('dryRun', true);
            fixture.componentRef.setInput('policyId', 'policy');
            tick();
            render(fixture);
            const row: HTMLElement = fixture.nativeElement.querySelector('.sf-lock');
            expect(field.control.disabled).toBeTrue();
            expect(row.querySelector('code')?.textContent).toBe(value);
            expect(actions().length).toBe(1);
            expect(actions()[0].componentInstance.url).toBe(value);
            expect(actions()[0].componentInstance.dryRun).toBeTrue();
            expect(row.querySelector('a')).toBeNull();
            expect(row.querySelector('button.sf-ro-open')?.textContent).toContain('Open');
            expect(Array.from(row.querySelectorAll('button[aria-label]')).map((button) => button.getAttribute('aria-label'))).toEqual(['Copy link', 'Copy CID']);
            expect(row.querySelector<HTMLButtonElement>('button[aria-label="Copy CID"]')?.disabled).toBeTrue();
        }));

        it('keeps one Copy value action for a locked non-IPFS field', fakeAsync(() => {
            const { fixture, field, actions } = build(false, '', 'Project name');
            tick();
            render(fixture);
            const row: HTMLElement = fixture.nativeElement.querySelector('.sf-lock');
            expect(field.control.disabled).toBeTrue();
            expect(row.querySelector('.pi-lock')).not.toBeNull();
            expect(row.querySelector('code')?.textContent).toBe('Project name');
            expect(actions().length).toBe(0);
            expect(row.querySelector('a')).toBeNull();
            expect(Array.from(row.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))).toEqual(['Copy value']);
            expect(fixture.debugElement.query(By.directive(CopyButtonComponent)).componentInstance.value).toBe('Project name');
        }));
    });

    it('keeps each array item independent while another item uploads', () => {
        const { fixture, field, actions } = build(true);
        field.list![0].control.setValue(value);
        field.list![1].control.setValue('ipfs://bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di');
        render(fixture);
        expect(actions().map((node) => node.componentInstance.url)).toEqual(field.list!.map((entry) => entry.control.value));
        field.list![0].fileUploading = true;
        render(fixture);
        expect(actions().length).toBe(1);
        expect(actions()[0].componentInstance.url).toBe(field.list![1].control.value);
        expect(actions()[0].nativeElement.querySelector('button[aria-label="Copy CID"]').disabled).toBeFalse();
    });
});
