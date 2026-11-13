import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
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
import { PolicyProgressService } from '../../../../services/policy-progress.service';
import { ToastService } from 'src/app/services/toast.service';
import { SchemaService } from 'src/app/services/schema.service';

describe('RequestDocumentFormComponent', () => {
    const progress = {
        activeStep$: of({ label: 'Project submittal' }),
        getCurrentRole: () => 'Project Proponent',
        getHasNavigation: () => true,
    };
    const apiCall = vi.fn();

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
            duplicateSubmitted: vi.fn(),
            onDialogOpen: vi.fn(),
            ...parentOverrides,
        } as any;
        Object.assign(component, formOverrides);
        fixture.detectChanges();
        component.loading = false;
        return { fixture, component };
    };

    beforeEach(async () => {
        apiCall.mockClear();
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
                { provide: SchemaService, useValue: { getSchemasByType: () => of(null) } },
                { provide: PolicyProgressService, useValue: progress },
                { provide: ToastService, useValue: { success: vi.fn() } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    it('keeps the default action of a click inside the More actions menu and closes the menu', () => {
        const { fixture, component } = create();
        const element: HTMLElement = fixture.nativeElement;
        element.querySelector<HTMLButtonElement>('.form-menu-toggle')!.click();
        fixture.detectChanges();
        expect(component.menuOpen).toBe(true);

        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
        element.querySelector('request-draft-file-actions')!.dispatchEvent(click);
        fixture.detectChanges();

        expect(click.defaultPrevented).toBe(false);
        expect(component.menuOpen).toBe(false);
        expect(element.querySelector<HTMLElement>('.form-menu-pop')!.hidden).toBe(true);
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
                revealErrors: vi.fn(),
                getIssues: () => [{ path: 'name', label: 'Name', message: 'Required' }],
                focusField: vi.fn(),
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
            expect(state.bad).toBe(true);
            expect(state.clickable).toBe(true);
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

        it('gives the document to the viewer and marks the active view button', () => {
            const { fixture, component } = create();
            (component as any).showSubmitted({ response: { document } }, { name: 'x' });
            fixture.detectChanges();
            const element: HTMLElement = fixture.nativeElement;

            expect((element.querySelector('app-document-view') as any).document).toBe(document);
            const buttons = [...element.querySelectorAll<HTMLButtonElement>('.form-submitted-bar .form-toggle button')];
            expect(buttons.map((button) => button.classList.contains('on'))).toEqual([true, false]);
            expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['true', 'false']);

            buttons[1].click();
            fixture.detectChanges();
            expect(buttons.map((button) => button.classList.contains('on'))).toEqual([false, true]);
            expect(element.querySelector('app-document-view')).not.toBeNull();
            expect(element.querySelector<HTMLElement>('pre.form-submitted-json')!.hidden).toBe(false);
            fixture.destroy();
        });

        it('keeps a viewer per visited preview card and shows the document in it', () => {
            const { fixture, component } = create();
            const item = (id: string, role: 'input' | 'result') => ({
                role, label: id, blockType: null, source: null, target: null, document: { id }, title: id, sub: ''
            });
            component.previewMode = true;
            (component as any).previewSubmitLabel = true;
            component.previewItems = [item('a', 'input'), item('b', 'result')] as any;
            component.previewIndex = 1;
            component.previewVisited = new Set([1]);
            component.screen = 'presults';
            (component as any).changeDetectorRef.markForCheck();
            fixture.detectChanges();
            const element: HTMLElement = fixture.nativeElement;
            const views = () => [...element.querySelectorAll('app-document-view')] as any[];

            expect(views().map((view) => view.document)).toEqual([{ id: 'b' }]);
            component.selectPreviewItem(0);
            (component as any).changeDetectorRef.markForCheck();
            fixture.detectChanges();
            expect(views().map((view) => view.document)).toEqual([{ id: 'a' }, { id: 'b' }]);
            expect(views().map((view) => view.parentElement.parentElement.hidden)).toEqual([false, true]);
            const buttons = [...element.querySelectorAll<HTMLButtonElement>('.form-pres-head .form-toggle button')];
            expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
            fixture.destroy();
        });

        it('builds the snapshot and stops the autosave', () => {
            const { fixture, component } = create();
            const autosave = new Subscription();
            (component as any).sub = autosave;
            (component as any).showSubmitted({ response: { document } }, { name: 'x' });
            fixture.detectChanges();

            expect(component.screen).toBe('submitted');
            expect(component.submitted).toEqual(expect.objectContaining({
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
            expect(autosave.closed).toBe(true);
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
            expect(component.canDuplicate).toBe(false);
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
            expect(component.canDuplicate).toBe(false);
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

    describe('submit timing', () => {
        const submit = (component: RequestDocumentFormComponent, draft: boolean) => {
            const target = component as any;
            target.storage = { delete: async () => undefined };
            target.tablePersist = { persistTablesInDocument: async () => undefined, rollbackIpfsUploads: async () => undefined };
            target.geoFilePersist = { persistGeoFilesInDocument: async () => undefined, rollbackGridFsUploads: async () => undefined };
            apiCall.mockReturnValue(of({ response: { document: { id: 'urn:uuid:1' } } }));
            return target.onSubmit(draft) as Promise<void>;
        };

        it('shows the Submitted screen 1 s after the request returns', fakeAsync(() => {
            const { fixture, component } = create();
            submit(component, false);
            tick(0);
            expect(apiCall).toHaveBeenCalled();
            expect(component.screen).not.toBe('submitted');
            tick(1000);
            expect(component.screen).toBe('submitted');
            fixture.destroy();
        }));

        it('marks a draft as saved instead of showing the Submitted screen', fakeAsync(() => {
            const { fixture, component } = create();
            submit(component, true);
            tick(1000);
            expect(component.screen).not.toBe('submitted');
            expect(component.dataSaved).toBe(true);
            fixture.destroy();
        }));

        it('clears the timer on destroy', fakeAsync(() => {
            const { fixture, component } = create();
            submit(component, false);
            tick(0);
            fixture.destroy();
            tick(1000);
            expect(component.screen).not.toBe('submitted');
        }));
    });
    describe('preview results display', () => {
        const item = (id: string) => ({ role: 'result', label: id, source: id, target: null,
            blockType: null, document: { id }, final: true, sameSchema: true, title: id, sub: '' });

        it('keeps the document list and final mark for a single result', () => {
            const { fixture, component } = create({}, { previewMode: true, screen: 'presults',
                previewItems: [item('output')], previewIndex: 0, previewVisited: new Set([0]),
                previewTab: 'json', previewJson: '{"total":20}' });
            const element: HTMLElement = fixture.nativeElement;
            expect(element.querySelector('.form-timeline')).not.toBeNull();
            expect(element.querySelector('.form-tl-expand')).toBeNull();
            expect(element.querySelector('.form-pres-doc')).not.toBeNull();
            expect(element.querySelector('.form-pres-doc')?.textContent).toContain('Final');
            expect(element.querySelector('.form-pres-doc')?.textContent).toContain('20');
            expect(element.textContent).not.toContain('Incomplete result');
            fixture.destroy();
        });

        it('shows a list for several matching final documents', () => {
            const { fixture } = create({}, { previewMode: true, screen: 'presults',
                previewItems: [item('first'), item('second')], previewIndex: 0, previewTab: 'json' });
            expect(fixture.nativeElement.querySelectorAll('.form-tl-item').length).toBe(2);
            fixture.destroy();
        });

        it('expands intermediate documents in order and lets the user select one', () => {
            const { fixture, component } = create({}, { previewMode: true, screen: 'presults',
                previewItems: [
                    { ...item('input'), role: 'input', final: false },
                    { ...item('middle-a'), final: false },
                    { ...item('middle-b'), final: false }, item('final')
                ], previewIndex: 3, previewTab: 'json' });
            const element: HTMLElement = fixture.nativeElement;
            expect(element.querySelectorAll('.form-tl-item:not(.form-tl-more)').length).toBe(2);
            const expand = element.querySelector<HTMLButtonElement>('.form-tl-expand')!;
            expect(expand.textContent?.trim()).toBe('2 intermediate documents');
            expand.click();
            fixture.detectChanges();
            expect(element.querySelector('.form-tl-expand')).toBeNull();
            const cards = element.querySelectorAll<HTMLButtonElement>('.form-tl-card');
            expect(Array.from(cards).map((card) => card.querySelector('b')?.textContent)).toEqual(['input', 'middle-a', 'middle-b', 'final']);
            expect(Array.from(cards).map((card) => card.querySelector('.form-tl-role')?.textContent))
                .toEqual(['Input document', 'Intermediate document', 'Intermediate document', 'Final document']);
            cards[1].click();
            fixture.detectChanges();
            expect(component.previewSelected?.document).toEqual({ id: 'middle-a' });
            expect(element.querySelector('.form-submitted-json')?.textContent).toContain('middle-a');
            fixture.destroy();
        });

        it('keeps the last unfinished document visible without a Final mark', () => {
            const { fixture } = create({}, { previewMode: true, screen: 'presults',
                previewItems: [{ ...item('input'), role: 'input', final: false },
                    { ...item('middle'), final: false }, { ...item('last'), final: false }],
                previewIndex: 2, previewVisited: new Set([2]), previewTab: 'json', previewJson: '{"id":"last"}',
                previewProblems: [{ blockType: 'customLogicBlock', message: 'stopped', errorData: null }] });
            const element: HTMLElement = fixture.nativeElement;
            expect(element.querySelector('h1')?.textContent).toBe('Preview results');
            expect(element.querySelectorAll('.form-tl-item:not(.form-tl-more)').length).toBe(2);
            expect(element.querySelector('.form-pres-doc')?.textContent).toContain('last');
            expect(element.querySelector('.form-pres-doc')?.textContent).not.toContain('Final');
            expect(element.querySelector('.form-pres-head .form-pill')?.textContent).toBe('Intermediate');
            const roles = element.querySelectorAll('.form-tl-role');
            expect(roles[roles.length - 1].textContent).toBe('Intermediate document');
            expect(element.querySelector('.form-notice-warn')).toBeNull();
            expect(element.textContent).toContain('Incomplete result');
            fixture.destroy();
        });

        it('keeps partial results visible until the incomplete result button is clicked', () => {
            const { fixture } = create({}, { previewMode: true, screen: 'presults',
                previewItems: [item('output')], previewIndex: 0, previewVisited: new Set([0]), previewTab: 'json',
                previewProblems: [{ blockType: 'customLogicBlock', message: 'amount above 100', errorData: null }] });
            const element: HTMLElement = fixture.nativeElement;
            expect(element.querySelector('.form-pres-doc')).not.toBeNull();
            expect(element.querySelector('.form-notice-warn')).toBeNull();
            const button = Array.from(element.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Incomplete result');
            expect(button).toBeDefined();
            button!.click();
            fixture.detectChanges();
            expect(element.querySelector('h1')?.textContent).toBe('The preview is incomplete');
            expect(element.querySelector('.form-pres-doc')).toBeNull();
            expect(element.textContent).toContain('amount above 100');
            expect(element.textContent).toContain('Back to the form');
            expect(element.textContent).toContain('Preview again');
            expect(element.textContent).not.toContain('Go to field');
            fixture.destroy();
        });
    });

});
