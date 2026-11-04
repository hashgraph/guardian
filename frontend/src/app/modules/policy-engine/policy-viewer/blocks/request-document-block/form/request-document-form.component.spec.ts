import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { of, Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';
import { DialogService } from 'primeng/dynamicdialog';
import { RequestDocumentFormComponent } from './request-document-form.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { RelayerAccountsService } from 'src/app/services/relayer-accounts.service';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { TablePersistenceService } from 'src/app/services/table-persistence.service';
import { GeoFilePersistenceService } from 'src/app/services/geo-file-persistence.service';
import { IPFSService } from 'src/app/services/ipfs.service';
import { PolicyTestAutomationService } from '../../../policy-test-automation/policy-test-automation.service';
import { FormulasService } from 'src/app/services/formulas.service';
import { CalculationPreviewService } from 'src/app/services/calculation-preview.service';
import { FormTakeoverService } from '../../../form-takeover/form-takeover.service';
import { PolicyProgressService } from '../../../../services/policy-progress.service';
import { ToastService } from 'src/app/services/toast.service';

describe('RequestDocumentFormComponent', () => {
    const progress = {
        activeStep$: of({ label: 'Project submittal' }),
        getCurrentRole: () => 'Project Proponent',
        getHasNavigation: () => true,
    };
    const takeover = { keep: jasmine.createSpy('keep') };
    const apiCall = jasmine.createSpy('setBlockDataWithResult');

    const create = (parentOverrides: Record<string, unknown> = {}, formOverrides: Record<string, unknown> = {}) => {
        const fixture = TestBed.createComponent(RequestDocumentFormComponent);
        const component = fixture.componentInstance;
        component.parent = {
            id: 'block-1',
            policyId: 'policy-1',
            title: 'Project submittal',
            dryRun: false,
            edit: false,
            draft: false,
            isDestroyed: false,
            getRef: () => null,
            getAutosaveId: () => 'autosave',
            duplicateSubmitted: jasmine.createSpy('duplicateSubmitted'),
            onDialogOpen: jasmine.createSpy('onDialogOpen'),
            ...parentOverrides,
        } as any;
        Object.assign(component, formOverrides);
        fixture.detectChanges();
        component.loading = false;
        return { fixture, component };
    };

    beforeEach(async () => {
        takeover.keep.calls.reset();
        apiCall.calls.reset();
        await TestBed.configureTestingModule({
            declarations: [RequestDocumentFormComponent],
            imports: [DatePipe],
            providers: [
                UntypedFormBuilder,
                { provide: DialogService, useValue: {} },
                { provide: PolicyEngineService, useValue: { setBlockDataWithResult: apiCall } },
                { provide: SchemaRulesService, useValue: { getSchemaRuleData: () => of([]) } },
                { provide: RelayerAccountsService, useValue: {} },
                { provide: IndexedDbRegistryService, useValue: { registerStore: () => undefined } },
                { provide: TablePersistenceService, useValue: {} },
                { provide: GeoFilePersistenceService, useValue: {} },
                { provide: IPFSService, useValue: {} },
                { provide: PolicyTestAutomationService, useValue: {} },
                { provide: FormulasService, useValue: {} },
                { provide: CalculationPreviewService, useValue: {} },
                { provide: PolicyProgressService, useValue: progress },
                { provide: FormTakeoverService, useValue: takeover },
                { provide: ToastService, useValue: { success: jasmine.createSpy('success') } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    it('keeps the default action of a click inside the More actions menu and closes the menu', () => {
        const { fixture, component } = create();
        const element: HTMLElement = fixture.nativeElement;
        element.querySelector<HTMLButtonElement>('.form-menu-toggle')!.click();
        fixture.detectChanges();
        expect(component.menuOpen).toBeTrue();

        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
        element.querySelector('request-draft-file-actions')!.dispatchEvent(click);
        fixture.detectChanges();

        expect(click.defaultPrevented).toBeFalse();
        expect(component.menuOpen).toBeFalse();
        expect(element.querySelector<HTMLElement>('.form-menu-pop')!.hidden).toBeTrue();
        fixture.destroy();
    });

    it('keeps the menu in edit mode', () => {
        const { fixture } = create({ edit: true });
        expect(fixture.nativeElement.querySelector('.form-menu-toggle')).not.toBeNull();
        fixture.destroy();
    });

    describe('validation results', () => {
        const invalid = (component: RequestDocumentFormComponent) => {
            const form = new UntypedFormGroup({ name: new FormControl('', Validators.required) });
            component.dataForm = form;
            const root = {
                revealErrors: jasmine.createSpy('revealErrors'),
                getIssues: () => [{ path: 'name', label: 'Name', message: 'Required' }],
                focusField: jasmine.createSpy('focusField'),
            };
            // The spec renders no schema, so there is no real form root. A fixed accessor keeps the
            // stand-in when change detection refreshes the @ViewChild query after a template change.
            Object.defineProperty(component, 'formRoot', { get: () => root, set: () => undefined, configurable: true });
            return root;
        };

        it('opens the results screen on an invalid submit and does not call the API', async () => {
            const { fixture, component } = create();
            const root = invalid(component);
            await component.onStep();
            fixture.detectChanges();

            expect(component.screen).toBe('results');
            expect(component.issues.length).toBe(1);
            expect(root.revealErrors).toHaveBeenCalledWith(false);
            expect(apiCall).not.toHaveBeenCalled();
            expect(fixture.nativeElement.querySelector('.form-issue')).not.toBeNull();
            fixture.destroy();
        });

        it('shows the error count on the step after going back', async () => {
            const { fixture, component } = create();
            invalid(component);
            await component.onStep();
            component.showForm();
            fixture.detectChanges();

            expect(component.screen).toBe('form');
            const state = component.stepState('results');
            expect(state.bad).toBeTrue();
            expect(state.clickable).toBeTrue();
            expect(fixture.nativeElement.querySelector('.form-step-count').textContent).toBe('1');
            fixture.destroy();
        });

        it('goes to the field through the form root after showing the form', async () => {
            const { fixture, component } = create();
            const root = invalid(component);
            await component.onStep();
            component.goToField('name');

            expect(component.screen).toBe('form');
            expect(root.focusField).toHaveBeenCalledWith('name');
            fixture.destroy();
        });

        it('re-validates from the step without submitting', async () => {
            const { fixture, component } = create();
            invalid(component);
            await component.onStep();
            component.showForm();
            component.dataForm.get('name')!.setValue('x');
            component.revalidate();

            expect(component.screen).toBe('form');
            expect(component.issues.length).toBe(0);
            expect(apiCall).not.toHaveBeenCalled();
            fixture.destroy();
        });
    });

    describe('submitted', () => {
        const document = { id: 'urn:uuid:1', issuanceDate: '2026-11-01T10:42:00.000Z' };

        it('builds the snapshot, stops the autosave and keeps the takeover', () => {
            const { fixture, component } = create();
            const autosave = new Subscription();
            (component as any).sub = autosave;
            (component as any).showSubmitted({ response: { document } }, { name: 'x' });
            fixture.detectChanges();

            expect(component.screen).toBe('submitted');
            expect(component.submitted).toEqual(jasmine.objectContaining({
                document,
                vcId: 'urn:uuid:1',
                issuedAt: '2026-11-01T10:42:00.000Z',
                role: 'Project Proponent',
                title: 'Project submittal',
                stepLabel: 'Project submittal',
                policyId: 'policy-1',
                dryRun: false,
                edit: false,
                payload: { name: 'x' },
            }));
            expect(autosave.closed).toBeTrue();
            expect(takeover.keep).toHaveBeenCalledWith(component);
            expect(fixture.nativeElement.querySelector('.form-submitted-banner')).not.toBeNull();
            expect(component.backLabel).toBe('Back to Project submittal');
            fixture.destroy();
        });

        it('shows only the banner when no document comes back', () => {
            const { fixture, component } = create();
            (component as any).showSubmitted({ response: {} }, { name: 'x' });
            fixture.detectChanges();

            expect(component.submitted!.document).toBeNull();
            expect(component.submitted!.vcId).toBeNull();
            const element: HTMLElement = fixture.nativeElement;
            expect(element.querySelector('.form-submitted-banner')).not.toBeNull();
            expect(element.querySelector('app-document-view')).toBeNull();
            fixture.destroy();
        });

        it('plain Back when the policy has no navigation', () => {
            const { component } = create();
            progress.getHasNavigation = () => false;
            (component as any).showSubmitted({ response: { document } }, {});
            progress.getHasNavigation = () => true;
            expect(component.backLabel).toBe('Back');
        });

        it('offers Duplicate and Create another in new mode', () => {
            const { fixture, component } = create();
            (component as any).showSubmitted({ response: { document } }, { name: 'x' });
            fixture.detectChanges();
            const labels = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.form-footer button'))
                .map((button) => button.textContent!.trim());
            expect(labels).toEqual(['Duplicate as new draft', 'Create another', 'Back to Project submittal']);

            component.onDuplicate();
            expect((component.parent as any).duplicateSubmitted).toHaveBeenCalledWith({ name: 'x' }, 'urn:uuid:1');
            fixture.destroy();
        });

        it('hides Duplicate and Create another in edit mode', () => {
            const { fixture, component } = create({ edit: true });
            (component as any).showSubmitted({ response: { document } }, {});
            fixture.detectChanges();
            expect(component.canDuplicate).toBeFalse();
            const labels = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.form-footer button'))
                .map((button) => button.textContent!.trim());
            expect(labels).toEqual(['Back to Project submittal']);
            fixture.destroy();
        });

        it('hides Duplicate and Create another once the block is destroyed', () => {
            const { fixture, component } = create();
            (component as any).showSubmitted({ response: { document } }, {});
            (component.parent as any).isDestroyed = true;
            fixture.detectChanges();
            expect(component.canDuplicate).toBeFalse();
            expect(fixture.nativeElement.querySelectorAll('.form-footer button').length).toBe(1);
            fixture.destroy();
        });

        it('closes without the unsaved changes dialog', () => {
            const { fixture, component } = create();
            component.dataForm.markAsDirty();
            (component as any).showSubmitted({ response: { document } }, {});
            let closed = 0;
            component.closed.subscribe(() => closed++);
            component.onClose();
            expect(closed).toBe(1);
            fixture.destroy();
        });
    });
});
