import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Subject, Subscription, of, takeUntil } from 'rxjs';
import { CommentsService } from 'src/app/services/comments.service';
import { FormulasService } from 'src/app/services/formulas.service';
import { GeoFilePersistenceService } from 'src/app/services/geo-file-persistence.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaFormPreferencesService } from 'src/app/services/schema-form-preferences.service';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { SchemaService } from 'src/app/services/schema.service';
import { TablePersistenceService } from 'src/app/services/table-persistence.service';
import { ToastService } from 'src/app/services/toast.service';
import { VCFullscreenDialog } from './vc-fullscreen-dialog.component';

describe('VCFullscreenDialog', () => {
    function build(): any {
        return new VCFullscreenDialog(
            {} as any, { data: {} } as any, {} as any, {} as any, {} as any,
            {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
            {} as any, new UntypedFormBuilder(), {} as any, {} as any, {} as any,
            {} as any, {} as any, {} as any,
        );
    }

    // Seven takeUntil sites guarded on a subject nothing ever fired, so every
    // open-and-close of the dialog leaked all of them.
    it('stops its guarded subscriptions on destroy', () => {
        const component = build();
        const source = new Subject<number>();
        const seen: number[] = [];
        source.pipe(takeUntil(component._viewDestroyed$)).subscribe((value) => seen.push(value));

        source.next(1);
        component.ngOnDestroy();
        source.next(2);

        expect(seen).toEqual([1]);
    });

    // _destroy$ may be handed in by the caller as a "close the dialog" signal, so the
    // dialog must not complete a subject its caller still owns and reuses.
    it('leaves a caller-supplied destroy subject usable', () => {
        const component = build();
        const callerOwned = new Subject<void>();
        component._destroy$ = callerOwned;
        let completed = false;
        callerOwned.subscribe({ complete: () => { completed = true; } });

        const received: string[] = [];
        callerOwned.subscribe(() => received.push('signal'));

        component.ngOnDestroy();
        callerOwned.next();

        expect(completed).toBeFalse();
        expect(received).toEqual(['signal']);
    });

    it('unsubscribes the close-signal subscription', () => {
        const component = build();
        const subscription = new Subscription();
        component._subscription = subscription;

        component.ngOnDestroy();

        expect(subscription.closed).toBeTrue();
    });

    describe('leaving edit mode with invalid changes', () => {
        const open = (result: unknown) => {
            const component = build();
            const dialog = { open: jasmine.createSpy('open').and.returnValue({ onClose: of(result) }) };
            component.dialog = dialog;
            component.dataForm = new UntypedFormBuilder().group({
                name: ['', Validators.required],
            });
            component.dataForm.markAsDirty();
            component.isEditMode = true;
            component.loadProfile = jasmine.createSpy('loadProfile');
            component.formRoots = { forEach: jasmine.createSpy('forEach') };
            return { component, dialog };
        };

        it('asks to discard, and leaves edit mode on confirmation', () => {
            const { component, dialog } = open(true);
            component.onEditMode();
            expect(dialog.open).toHaveBeenCalledTimes(1);
            const config = dialog.open.calls.mostRecent().args[1];
            expect(config.header).toBe('Unsaved changes');
            expect(config.data.okBtnName).toBe('Discard changes');
            expect(config.data.closeBtnName).toBe('Keep editing');
            expect(component.loadProfile).toHaveBeenCalled();
            expect(component.isEditMode).toBeFalse();
        });

        it('stays in edit mode when the user keeps editing', () => {
            const { component } = open(false);
            component.onEditMode();
            expect(component.loadProfile).not.toHaveBeenCalled();
            expect(component.isEditMode).toBeTrue();
        });

        it('reveals errors instead of asking when it is not a mode switch', () => {
            const { component, dialog } = open(true);
            component.onUpdatableBtnEvent();
            expect(dialog.open).not.toHaveBeenCalled();
            expect(component.formRoots.forEach).toHaveBeenCalled();
        });
    });

    it('edits the first credential subject only', () => {
        const component = build();
        component.subjects = [{ id: 1 }, { id: 2 }, { id: 3 }];
        expect(component.editSubjects).toEqual([{ id: 1 }]);
        component.subjects = [];
        expect(component.editSubjects).toEqual([]);
    });
    describe('header and bar', () => {
        const render = (data: Record<string, unknown>) => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                declarations: [VCFullscreenDialog],
                providers: [
                    { provide: DynamicDialogRef, useValue: { close: () => undefined } },
                    { provide: DynamicDialogConfig, useValue: { data: { type: 'VC', document: { id: 'vc-1', credentialSubject: {} }, ...data } } },
                    { provide: DialogService, useValue: {} },
                    { provide: ProfileService, useValue: { getProfile: () => of({}) } },
                    { provide: CommentsService, useValue: { getPolicyCommentsCount: () => of({ fields: {} }) } },
                    { provide: ActivatedRoute, useValue: {} },
                    { provide: Router, useValue: {} },
                    { provide: SchemaService, useValue: {} },
                    { provide: SchemaRulesService, useValue: {} },
                    { provide: FormulasService, useValue: {} },
                    { provide: PolicyEngineService, useValue: { getAllVersionVcDocuments: () => of([]) } },
                    { provide: ToastService, useValue: {} },
                    { provide: TablePersistenceService, useValue: {} },
                    { provide: GeoFilePersistenceService, useValue: {} },
                    { provide: SchemaFormPreferencesService, useValue: { showFieldMetadata$: of(false), setShowFieldMetadata: () => undefined } },
                ],
                schemas: [NO_ERRORS_SCHEMA],
            });
            const fixture = TestBed.createComponent(VCFullscreenDialog);
            fixture.detectChanges();
            tick(500);
            fixture.componentRef.changeDetectorRef.markForCheck();
            fixture.detectChanges();
            return fixture;
        };
        const refresh = (fixture: ComponentFixture<VCFullscreenDialog>) => {
            fixture.componentRef.changeDetectorRef.markForCheck();
            fixture.detectChanges();
        };
        const el = (fixture: ComponentFixture<VCFullscreenDialog>, selector: string): HTMLElement | null =>
            fixture.nativeElement.querySelector(selector);

        it('shows the context line when passed and omits it when empty', fakeAsync(() => {
            expect(el(render({ subtitle: 'Policy · Step' }), '.header-eyebrow')?.textContent).toContain('Policy · Step');
            expect(el(render({}), '.header-eyebrow')).toBeNull();
        }));

        it('heads the view with the schema name once it is known', fakeAsync(() => {
            const fixture = render({ title: 'VC' });
            expect(el(fixture, '.header-text')?.textContent?.trim()).toBe('VC');
            fixture.componentInstance.onSchemaName('Project Description');
            refresh(fixture);
            expect(el(fixture, '.header-text')?.textContent?.trim()).toBe('Project Description');
        }));

        it('keeps the document alive in the JSON view', fakeAsync(() => {
            const fixture = render({});
            fixture.componentInstance.onToggle(1);
            refresh(fixture);
            expect(el(fixture, '.document-view')).not.toBeNull();
            expect(el(fixture, '.document-view')?.hidden).toBeTrue();
            fixture.componentInstance.onToggle(0);
            refresh(fixture);
            expect(el(fixture, '.document-view')?.hidden).toBeFalse();
        }));

        it('works as a takeover with its options as an input and no dialog ref', fakeAsync(() => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                declarations: [VCFullscreenDialog],
                providers: [
                    { provide: DialogService, useValue: {} },
                    { provide: ProfileService, useValue: { getProfile: () => of({}) } },
                    { provide: CommentsService, useValue: {} },
                    { provide: ActivatedRoute, useValue: {} },
                    { provide: Router, useValue: {} },
                    { provide: SchemaService, useValue: {} },
                    { provide: SchemaRulesService, useValue: {} },
                    { provide: FormulasService, useValue: {} },
                    { provide: PolicyEngineService, useValue: { getAllVersionVcDocuments: () => of([]) } },
                    { provide: ToastService, useValue: {} },
                    { provide: TablePersistenceService, useValue: {} },
                    { provide: GeoFilePersistenceService, useValue: {} },
                    { provide: SchemaFormPreferencesService, useValue: { showFieldMetadata$: of(false), setShowFieldMetadata: () => undefined } },
                ],
                schemas: [NO_ERRORS_SCHEMA],
            });
            const fixture = TestBed.createComponent(VCFullscreenDialog);
            fixture.componentRef.setInput('config', { type: 'VC', title: 'Doc', subtitle: 'Policy', comments: false, document: { id: 'vc-1', credentialSubject: {} } });
            fixture.detectChanges();
            tick(500);
            expect(fixture.nativeElement.classList).toContain('takeover');
            expect(fixture.nativeElement.querySelector('.header-eyebrow')?.textContent).toContain('Policy');
            let closed = 0;
            fixture.componentInstance.closed.subscribe(() => closed++);
            fixture.componentInstance.onClose();
            expect(closed).toBe(1);
        }));

        it('always labels the back button "Back"', fakeAsync(() => {
            const fixture = render({ backLabel: 'Back to Policy' });
            expect(el(fixture, '.back-button')?.textContent?.trim()).toBe('Back');
        }));

        it('reads "Edit", then "Done editing", and drops row 2 in edit mode', fakeAsync(() => {
            const fixture = render({});
            const component: any = fixture.componentInstance;
            component.isCurrentUserOwner = true;
            component.allVcDocs = [{ oldVersion: false }];
            component.loadData = () => undefined;
            refresh(fixture);
            expect(el(fixture, '.mode-btn')?.textContent?.trim()).toBe('Edit');
            expect(el(fixture, '.vc-fullscreen-dialog-bar')).not.toBeNull();

            component.onEditMode();
            refresh(fixture);
            expect(el(fixture, '.mode-btn')?.textContent?.trim()).toBe('Done editing');
            expect(el(fixture, '.vc-fullscreen-dialog-bar')).toBeNull();
        }));

        it('switches the view with the Document and JSON buttons', fakeAsync(() => {
            const fixture = render({});
            const buttons = () => Array.from(fixture.nativeElement.querySelectorAll('.form-toggle button')) as HTMLButtonElement[];
            expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Document', 'JSON']);
            expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);

            buttons()[1].click();
            refresh(fixture);
            expect(fixture.componentInstance.currentTab).toBe(1);
            expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);

            buttons()[0].click();
            refresh(fixture);
            expect(fixture.componentInstance.currentTab).toBe(0);
        }));

        it('hides the discussions in the JSON view without removing them', fakeAsync(() => {
            const fixture = render({ comments: true });
            expect(el(fixture, '.document-content')?.getAttribute('comments')).toBe('true');
            expect(el(fixture, '.comments-content')?.hidden).toBeFalse();

            fixture.componentInstance.onToggle(1);
            refresh(fixture);
            expect(el(fixture, '.comments-content')).not.toBeNull();
            expect(el(fixture, '.comments-content')?.hidden).toBeTrue();
            expect(el(fixture, '.document-content')?.getAttribute('comments')).toBe('false');
        }));
    });
});
