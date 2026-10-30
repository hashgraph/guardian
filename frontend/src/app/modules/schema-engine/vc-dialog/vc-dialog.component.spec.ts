import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AccordionModule } from 'primeng/accordion';
import { DocumentViewComponent } from '../document-view/document-view.component';
import { SchemaFormViewComponent } from '../schema-form-view/schema-form-view.component';
import { SchemaFormViewNavigationComponent } from '../schema-form-view-navigation/schema-form-view-navigation.component';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { FormulasService } from 'src/app/services/formulas.service';
import { IPFSService } from 'src/app/services/ipfs.service';
import { SchemaService } from '../../../services/schema.service';
import { ProfileService } from 'src/app/services/profile.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { VCViewerDialog } from './vc-dialog.component';

describe('VCViewerDialog preview documents', () => {
    const open = (data: Record<string, unknown>) => {
        const dialog = Object.create(VCViewerDialog.prototype) as any;
        dialog.viewDocumentOptions = [];
        dialog.allVcDocs = [];
        dialog.previewDocuments = [];
        dialog.previewOptions = [];
        dialog.selectedPreviewIndex = 0;
        dialog.dialogConfig = { data };
        dialog.profileService = { getProfile: () => of({}) };
        dialog.schemaService = {};
        dialog.policyEngineService = {};
        dialog.ref = { markForCheck: () => undefined, detectChanges: () => undefined };
        dialog.ngOnInit();
        tick(48);
        return dialog;
    };

    const documents = [
        { label: '1. t09_save_a', document: { id: 'vc-a' } },
        { label: '2. t09_save_b', document: { id: 'vc-b' } },
    ];

    it('offers one option per returned document and shows the first one', fakeAsync(() => {
        const dialog = open({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents });
        expect(dialog.previewOptions).toEqual([
            { label: '1. t09_save_a', value: 0 },
            { label: '2. t09_save_b', value: 1 },
        ]);
        expect(dialog.document).toEqual({ id: 'vc-a' });
        expect(dialog.viewDocument).toBeTrue();
    }));

    it('switches the shown document when another option is chosen', fakeAsync(() => {
        const dialog = open({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents });
        dialog.onPreviewDocumentChange({ value: 1 });
        tick(48);
        expect(dialog.selectedPreviewIndex).toBe(1);
        expect(dialog.document).toEqual({ id: 'vc-b' });
        expect(JSON.parse(dialog.json)).toEqual({ id: 'vc-b' });
        expect(dialog.loading).toBeFalse();
    }));

    it('has no document options when it is opened the usual way', fakeAsync(() => {
        const dialog = open({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
        expect(dialog.previewDocuments).toEqual([]);
        expect(dialog.previewOptions).toEqual([]);
    }));

    describe('code view size limit', () => {
        const large = { id: 'vc-large', rows: Array.from({ length: 150000 }, () => ({ a: 1 })) };

        it('measures the formatted preview text and measures it again for another document', fakeAsync(() => {
            const dialog = open({ type: 'VC', viewDocument: true, document: large, previewDocuments: [
                { label: '1. large', document: large },
                { label: '2. small', document: { id: 'vc-small' } },
            ] });
            expect(new Blob([JSON.stringify(large)]).size).toBeLessThan(1.5 * 1024 * 1024);
            expect(dialog.fileSize).toBeGreaterThan(1);
            dialog.onPreviewDocumentChange({ value: 1 });
            tick(48);
            expect(dialog.fileSize).toBe(0);
        }));

        it('keeps the compact measure of an ordinary document', fakeAsync(() => {
            const dialog = open({ type: 'VC', viewDocument: true, document: large });
            expect(dialog.fileSize).toBe(1);
        }));
    });

    describe('form view switching', () => {
        const render = (data: Record<string, unknown>, ready = true) => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                declarations: [VCViewerDialog],
                providers: [
                    { provide: DynamicDialogRef, useValue: { close: () => undefined } },
                    { provide: DynamicDialogConfig, useValue: { data } },
                    { provide: DialogService, useValue: {} },
                    { provide: SchemaService, useValue: {} },
                    { provide: ProfileService, useValue: { getProfile: () => of({}) } },
                    { provide: ActivatedRoute, useValue: {} },
                    { provide: Router, useValue: {} },
                    { provide: PolicyEngineService, useValue: {} },
                ],
                schemas: [NO_ERRORS_SCHEMA],
            });
            const fixture = TestBed.createComponent(VCViewerDialog);
            fixture.detectChanges();
            if (ready) {
                tick(48);
                fixture.detectChanges();
            }
            return fixture;
        };
        const view = (fixture: ComponentFixture<VCViewerDialog>) => fixture.nativeElement.querySelector('app-document-view');
        const show = (fixture: ComponentFixture<VCViewerDialog>, value: boolean) => {
            fixture.componentInstance.viewDocument = value;
            fixture.componentRef.changeDetectorRef.markForCheck();
            fixture.detectChanges();
        };

        it('paints a Preview overlay before preparing formatted result text', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents }, false);
            expect(fixture.componentInstance.json).toBe('');
            expect(view(fixture)).not.toBeNull();
            expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).not.toBeNull();
            tick(16);
            expect(fixture.componentInstance.json).toBe('');
            tick(16);
            fixture.detectChanges();
            expect(JSON.parse(fixture.componentInstance.json)).toEqual({ id: 'vc-a' });
            expect(view(fixture)).not.toBeNull();
            expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).not.toBeNull();
            tick(16);
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).toBeNull();
        }));

        it('cancels unfinished initial Preview preparation when closed', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents }, false);
            tick(16);
            fixture.destroy();
            tick(64);
            expect(fixture.componentInstance.json).toBe('');
        }));

        it('keeps the preview form while the code view is shown', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents });
            const form = view(fixture);
            expect(form.hidden).toBeFalse();
            expect(form.preview).toBeTrue();
            show(fixture, false);
            expect(view(fixture)).toBe(form);
            expect(form.hidden).toBeTrue();
            show(fixture, true);
            expect(view(fixture)).toBe(form);
            expect(form.hidden).toBeFalse();
        }));

        it('still removes the form of an ordinary document on the code view', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
            expect(view(fixture).preview).toBeUndefined();
            show(fixture, false);
            expect(view(fixture)).toBeNull();
        }));

        it('centers one Preview overlay over the dialog body while section renders overlap', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents });
            const documentView = fixture.debugElement.query(By.css('app-document-view'));
            const change = (loading: boolean) => {
                documentView.triggerEventHandler('previewLoadingChange', loading);
                fixture.detectChanges();
            };
            change(true);
            change(true);
            const overlay = fixture.nativeElement.querySelector('.preview-loading-overlay');
            expect(overlay.parentElement).toBe(fixture.nativeElement.querySelector('.dialog-body'));
            expect(overlay.closest('.view-dialog-content')).toBeNull();
            expect(getComputedStyle(overlay).position).toBe('absolute');
            expect(getComputedStyle(overlay).alignItems).toBe('center');
            expect(getComputedStyle(overlay).backgroundColor).toBe('rgb(255, 255, 255)');
            expect(getComputedStyle(overlay).opacity).toBe('0.5');
            const spinner = overlay.querySelector('.guardian-loading-image');
            expect(spinner).not.toBeNull();
            const style = getComputedStyle(spinner);
            expect(style.animationName).toContain('preview-loading-spin');
            expect(style.animationDuration).toBe('0.8s');
            expect(style.animationTimingFunction).toBe('linear');
            expect(style.willChange).toBe('transform');
            change(false);
            expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).toBe(overlay);
            change(false);
            expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).toBeNull();
        }));

        it('does not add a loading overlay to an ordinary document dialog', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
            fixture.componentInstance.onPreviewLoadingChange(true);
            fixture.detectChanges();
            expect(fixture.componentInstance.previewLoadingCount).toBe(0);
            expect(fixture.nativeElement.querySelector('.preview-viewer')).toBeNull();
            expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).toBeNull();
        }));

        for (const source of ['section', 'network', 'preparation']) {
            it(`keeps Preview view switches, download and closing available while ${source} loading is active`, fakeAsync(() => {
                const fixture = render({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents });
                const dialog = fixture.componentInstance;
                if (source === 'section') dialog.onPreviewLoadingChange(true);
                if (source === 'network') dialog.loading = true;
                if (source === 'preparation') dialog.previewPreparing = true;
                fixture.componentRef.changeDetectorRef.markForCheck();
                fixture.detectChanges();
                const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.dialog-footer button'));
                expect(buttons.find(button => button.textContent?.trim() === 'Download')?.disabled).toBeFalse();
                const download = buttons.find(button => button.textContent?.trim() === 'Download')!;
                const downloaded = spyOn(dialog, 'onDownloadJsonFile');
                download.click();
                expect(downloaded).toHaveBeenCalled();
                const close = buttons.find(button => button.textContent?.trim() === 'Close')!;
                expect(close.disabled).toBeFalse();
                expect(fixture.nativeElement.querySelector('.context').inert).toBeFalse();
                expect(fixture.nativeElement.querySelector('.view-dialog-content').inert).toBeTrue();
                expect(fixture.nativeElement.querySelector('.header-container').inert).toBeTrue();
                expect(fixture.nativeElement.querySelector('.header-icon.resize').getAttribute('aria-disabled')).toBe('true');
                expect(fixture.nativeElement.querySelector('p-selectbutton').disabled).toBeFalse();
                const ref = TestBed.inject(DynamicDialogRef);
                const closed = spyOn(ref, 'close');
                close.click();
                expect(closed).toHaveBeenCalledWith(null);
            }));
        }

        it('keeps ordinary dialog actions under their previous loading rules', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
            fixture.componentInstance.loading = true;
            fixture.componentRef.changeDetectorRef.markForCheck();
            fixture.detectChanges();
            expect(fixture.componentInstance.isPreviewBusy).toBeFalse();
            expect(fixture.nativeElement.querySelector('.context').inert).toBeFalse();
            expect(fixture.nativeElement.querySelector('.header-icon.resize').hasAttribute('aria-disabled')).toBeFalse();
            expect(fixture.nativeElement.querySelector('.dialog-footer button').disabled).toBeFalse();
        }));
    });

    it('shows the modal loading overlay for an actual Preview accordion-header click', fakeAsync(() => {
        const document = { issuer: 'did:example:issuer', credentialSubject: [{ type: 'report', section: { rate: 3 } }] };
        const schema = { iri: '#report', document: {
            $id: '#report', type: 'object', properties: { section: { $ref: '#section', description: 'Report section' } },
            $defs: { '#section': { $id: '#section', type: 'object',
                properties: { rate: { type: 'number', title: 'Rate', description: 'Rate' } } } },
        } };
        TestBed.configureTestingModule({
            declarations: [VCViewerDialog, DocumentViewComponent, SchemaFormViewComponent, SchemaFormViewNavigationComponent],
            imports: [CommonModule, AccordionModule],
            providers: [
                { provide: DynamicDialogRef, useValue: { close: () => undefined } },
                { provide: DynamicDialogConfig, useValue: { data: { type: 'VC', viewDocument: true, document,
                    previewDocuments: [{ label: 'Report', document }] } } },
                { provide: DialogService, useValue: {} },
                { provide: SchemaService, useValue: { getSchemasByType: () => of(schema) } },
                { provide: SchemaRulesService, useValue: { getSchemaRuleData: () => of(null) } },
                { provide: FormulasService, useValue: {} },
                { provide: IPFSService, useValue: {} },
                { provide: ProfileService, useValue: { getProfile: () => of({}) } },
                { provide: ActivatedRoute, useValue: {} },
                { provide: Router, useValue: {} },
                { provide: PolicyEngineService, useValue: {} },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(VCViewerDialog);
        fixture.detectChanges();
        tick(1000);
        fixture.detectChanges();
        expect(fixture.componentInstance.previewLoadingCount).toBe(0);
        const view = fixture.debugElement.query(By.directive(SchemaFormViewComponent));
        const item = view.componentInstance.fields[0];
        expect(item.open).toBeFalse();
        const header = view.query(By.css('p-accordion-header'));
        header.nativeElement.click();
        fixture.detectChanges();
        expect(item.open).toBeTrue();
        expect(item.previewReady).not.toBeTrue();
        expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).not.toBeNull();
        tick(0);
        tick(32);
        fixture.detectChanges();
        expect(item.previewReady).toBeTrue();
        expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).not.toBeNull();
        tick(16);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).toBeNull();
    }));
});
