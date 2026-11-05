import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import { SchemaService } from '../../../services/schema.service';
import { ProfileService } from 'src/app/services/profile.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { VCViewerDialog } from './vc-dialog.component';

describe('VCViewerDialog', () => {
    const open = (data: Record<string, unknown>) => {
        const dialog = Object.create(VCViewerDialog.prototype) as any;
        dialog.viewDocumentOptions = [];
        dialog.allVcDocs = [];
        dialog.dialogConfig = { data };
        dialog.profileService = { getProfile: () => of({}) };
        dialog.schemaService = {};
        dialog.policyEngineService = {};
        dialog.ref = { markForCheck: () => undefined, detectChanges: () => undefined };
        dialog.ngOnInit();
        tick(48);
        return dialog;
    };

    it('shows the document it was opened with', fakeAsync(() => {
        const dialog = open({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
        expect(dialog.document).toEqual({ id: 'vc-1' });
        expect(JSON.parse(dialog.json)).toEqual({ id: 'vc-1' });
        expect(dialog.viewDocument).toBeTrue();
    }));

    it('keeps the compact measure of an ordinary document', fakeAsync(() => {
        const large = { id: 'vc-large', rows: Array.from({ length: 150000 }, () => ({ a: 1 })) };
        const dialog = open({ type: 'VC', viewDocument: true, document: large });
        expect(dialog.fileSize).toBe(1);
    }));

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
            tick(48);
            fixture.detectChanges();
            return fixture;
        };
        const view = (fixture: ComponentFixture<VCViewerDialog>) => fixture.nativeElement.querySelector('app-document-view');
        const show = (fixture: ComponentFixture<VCViewerDialog>, value: boolean) => {
            fixture.componentInstance.viewDocument = value;
            fixture.componentRef.changeDetectorRef.markForCheck();
            fixture.detectChanges();
        };

        it('keeps the document alive, hidden, on the code view', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
            expect(view(fixture).preview).toBeUndefined();
            const before = view(fixture);
            show(fixture, false);
            expect(view(fixture)).toBe(before);
            expect(view(fixture).closest('.view-dialog-document').hidden).toBeTrue();
            show(fixture, true);
            expect(view(fixture)).toBe(before);
            expect(view(fixture).closest('.view-dialog-document').hidden).toBeFalse();
        }));

        const toggleButtons = (fixture: ComponentFixture<VCViewerDialog>) =>
            Array.from(fixture.nativeElement.querySelectorAll('.view-dialog-bar .form-toggle button')) as HTMLButtonElement[];

        it('renders one toggle button per view option, including appended ones', fakeAsync(() => {
            const fixture = render({
                type: 'VC',
                viewDocument: true,
                document: { id: 'vc-1' },
                additionalOptions: [{ label: 'Map', value: 'map', icon: 'file' }],
            });
            expect(toggleButtons(fixture).map((b) => b.textContent?.trim())).toEqual(['Document', 'JSON', 'Map']);
            expect(toggleButtons(fixture).map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
        }));

        it('switches the view when a toggle button is clicked', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
            toggleButtons(fixture)[1].click();
            fixture.componentRef.changeDetectorRef.markForCheck();
            fixture.detectChanges();
            expect(fixture.componentInstance.viewDocument).toBeFalse();
            expect(toggleButtons(fixture).map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
        }));

        it('adds no preview overlay to the document dialog', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
            expect(fixture.nativeElement.querySelector('.preview-viewer')).toBeNull();
            expect(fixture.nativeElement.querySelector('.preview-loading-overlay')).toBeNull();
        }));

        it('keeps the dialog actions available while the document loads', fakeAsync(() => {
            const fixture = render({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
            fixture.componentInstance.loading = true;
            fixture.componentRef.changeDetectorRef.markForCheck();
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.context').inert).toBeFalse();
            expect(fixture.nativeElement.querySelector('.header-icon.resize').hasAttribute('aria-disabled')).toBeFalse();
            expect(fixture.nativeElement.querySelector('.dialog-footer button').disabled).toBeFalse();
        }));
    });
});
