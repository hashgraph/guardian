import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
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
        return dialog;
    };

    const documents = [
        { label: '1. t09_save_a', document: { id: 'vc-a' } },
        { label: '2. t09_save_b', document: { id: 'vc-b' } },
    ];

    it('offers one option per returned document and shows the first one', () => {
        const dialog = open({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents });
        expect(dialog.previewOptions).toEqual([
            { label: '1. t09_save_a', value: 0 },
            { label: '2. t09_save_b', value: 1 },
        ]);
        expect(dialog.document).toEqual({ id: 'vc-a' });
        expect(dialog.viewDocument).toBeTrue();
    });

    it('switches the shown document when another option is chosen', () => {
        jasmine.clock().install();
        try {
            const dialog = open({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents });
            dialog.onPreviewDocumentChange({ value: 1 });
            expect(dialog.selectedPreviewIndex).toBe(1);
            expect(dialog.document).toEqual({ id: 'vc-b' });
            expect(JSON.parse(dialog.json)).toEqual({ id: 'vc-b' });
            jasmine.clock().tick(500);
            expect(dialog.loading).toBeFalse();
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('has no document options when it is opened the usual way', () => {
        const dialog = open({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
        expect(dialog.previewDocuments).toEqual([]);
        expect(dialog.previewOptions).toEqual([]);
    });

    describe('code view size limit', () => {
        const large = { id: 'vc-large', rows: Array.from({ length: 150000 }, () => ({ a: 1 })) };

        it('measures the formatted preview text and measures it again for another document', () => {
            jasmine.clock().install();
            try {
                const dialog = open({ type: 'VC', viewDocument: true, document: large, previewDocuments: [
                    { label: '1. large', document: large },
                    { label: '2. small', document: { id: 'vc-small' } },
                ] });
                expect(new Blob([JSON.stringify(large)]).size).toBeLessThan(1.5 * 1024 * 1024);
                expect(dialog.fileSize).toBeGreaterThan(1);
                dialog.onPreviewDocumentChange({ value: 1 });
                expect(dialog.fileSize).toBe(0);
                jasmine.clock().tick(500);
            } finally {
                jasmine.clock().uninstall();
            }
        });

        it('keeps the compact measure of an ordinary document', () => {
            const dialog = open({ type: 'VC', viewDocument: true, document: large });
            expect(dialog.fileSize).toBe(1);
        });
    });

    describe('form view switching', () => {
        const render = (data: Record<string, unknown>) => {
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
            return fixture;
        };
        const view = (fixture: ComponentFixture<VCViewerDialog>) => fixture.nativeElement.querySelector('app-document-view');
        const show = (fixture: ComponentFixture<VCViewerDialog>, value: boolean) => {
            fixture.componentInstance.viewDocument = value;
            fixture.componentRef.changeDetectorRef.markForCheck();
            fixture.detectChanges();
        };

        it('keeps the preview form while the code view is shown', () => {
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
        });

        it('still removes the form of an ordinary document on the code view', () => {
            const fixture = render({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
            expect(view(fixture).preview).toBeUndefined();
            show(fixture, false);
            expect(view(fixture)).toBeNull();
        });
    });
});
