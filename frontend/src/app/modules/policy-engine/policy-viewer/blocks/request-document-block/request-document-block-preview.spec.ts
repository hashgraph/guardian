import { fakeAsync, tick } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { RequestDocumentBlockComponent } from './request-document-block.component';
import { RequestDocumentFormComponent } from './form/request-document-form.component';
import { HttpErrorResponse } from '@angular/common/http';
import { CalculationPreviewService, normalizePreviewResult } from 'src/app/services/calculation-preview.service';

describe('request document preview wiring', () => {
    const saved = [{ source: 'form', target: 'save', document: { document: { id: 'vc-1' } } }];
    const scriptError = { message: 'rate is required', blockType: 'customLogicBlock', errorData: null };
    const response = (fields: string[], missingFields: string[] = [], documents: unknown[] = saved, errors: unknown[] = []) =>
        normalizePreviewResult({ fields, missingFields, documents, errors });

    const preview = (results: Promise<unknown>[]) => {
        const calls: { previewFields: boolean; ref: unknown }[] = [];
        const real = Object.create(CalculationPreviewService.prototype);
        return {
            calls,
            service: {
                run: (_policyId: string, _blockId: string, _value: unknown, ref: unknown, previewFields: boolean) => {
                    calls.push({ previewFields, ref });
                    return results.shift();
                },
                loadMode: jasmine.createSpy('loadMode').and.returnValue(false),
                saveMode: jasmine.createSpy('saveMode'),
                getInputValidation: CalculationPreviewService.prototype.getInputValidation,
                updateRequiredFields: CalculationPreviewService.prototype.updateRequiredFields,
                getTimeline: (result: any) => CalculationPreviewService.prototype.getTimeline.call(real, result),
                getProblems: CalculationPreviewService.prototype.getProblems,
                needsDiscoveryWarning: CalculationPreviewService.prototype.needsDiscoveryWarning,
            },
        };
    };

    const form = (results: Promise<unknown>[], parent: unknown) => {
        const component = Object.create(RequestDocumentFormComponent.prototype) as any;
        const fake = preview(results);
        const uploads: string[] = [];
        const dialogs: { type: unknown; config: any }[] = [];
        component.calculationPreview = fake.service;
        component.parent = parent;
        component.destroy$ = new Subject<void>();
        component.dataForm = { valid: true, getRawValue: () => ({ amount: 5 }) };
        component.changeDetectorRef = { markForCheck: () => undefined, detectChanges: () => undefined };
        component.formRoot = { revealErrors: jasmine.createSpy('revealErrors'), getIssues: () => [], focusField: () => undefined };
        component.issues = [];
        component.ruleIssues = [];
        component.dialogService = { open: (type: unknown, config: any) => dialogs.push({ type, config }) };
        component.tablePersist = {
            persistTablesInDocument: async () => uploads.push('tables'),
            rollbackIpfsUploads: async () => undefined,
        };
        component.geoFilePersist = {
            persistGeoFilesInDocument: async () => uploads.push('geo'),
            rollbackGridFsUploads: async () => undefined,
        };
        component.storage = { delete: () => undefined };
        component.policyEngineService = { setBlockDataWithResult: () => ({ subscribe: () => uploads.push('submit') }) };
        component.policyTest = { state: { captureNextFormSubmit: false } };
        component.step = 'fill';
        component.screen = 'form';
        component.enableAdditionalData = false;
        component.evidenceFiles = [];
        component.evidenceText = '';
        component.buttonNames = { submit: 'Validate & Create' };
        component.loading = false;
        component.previewMode = false;
        component.previewRequiredFields = null;
        component.previewMissingFields = [];
        component.previewRequest = 0;
        component.previewVisited = new Set<number>();
        component.previewLoadingByCard = new Map<number, number>();
        component.previewRequiredText = '';
        component.docTab = 'doc';
        component.previewTab = 'doc';
        return { component, calls: fake.calls, uploads, dialogs };
    };

    const blockParent = () => {
        const parent = Object.create(RequestDocumentBlockComponent.prototype) as any;
        parent.user = { id: 'user-1' };
        parent.id = 'block-1';
        parent.policyId = 'policy-1';
        parent.disabled = false;
        parent.relayerAccount = false;
        parent.getRef = () => ({ id: 'ref-2' });
        parent.getAutosaveId = () => 'autosave';
        return parent;
    };

    const settle = () => new Promise((resolve) => setTimeout(resolve));

    const observedForm = (results: Promise<unknown>[]) => {
        const state = form(results, blockParent());
        const group = new FormGroup({ mode: new FormControl('ccb'), title: new FormControl('old'), other: new FormControl('x') });
        state.component.formRoot.model = { controls: [
            { name: 'mode', enum: ['ccb', 'vcs'], control: group.get('mode') },
            { name: 'title', type: 'string', control: group.get('title') },
            { name: 'other', type: 'string', control: group.get('other') }
        ] };
        state.component.initForm(group, false);
        state.component.previewMode = true;
        state.component.setPreviewRequiredFields(['mode', 'title']);
        return { ...state, group };
    };

    it('refreshes requirements when a read choice changes', fakeAsync(() => {
        const { component, group, calls } = observedForm([Promise.resolve(response(['mode', 'vcs']))]);
        group.get('mode')!.setValue('vcs');
        expect(component.previewRequirementsStale).toBeTrue();
        tick();
        expect(calls.length).toBe(1);
        expect(component.previewRequiredFields).toEqual(['mode', 'vcs']);
        expect(component.previewRequirementsStale).toBeFalse();
        component.destroy$.next();
    }));

    it('does not repeat a pending choice discovery on unrelated edits', fakeAsync(() => {
        let resolveFirst!: (value: unknown) => void;
        const pending = new Promise(resolve => { resolveFirst = resolve; });
        const { component, group, calls } = observedForm([pending]);
        group.get('mode')!.setValue('vcs');
        tick();
        tick();
        group.get('other')!.setValue('changed');
        tick();
        expect(calls.length).toBe(1);
        resolveFirst(response(['mode', 'title']));
        tick();
        expect(calls.length).toBe(1);
        expect(component.previewRequirementsStale).toBeFalse();
        component.destroy$.next();
    }));

    it('does not refresh automatically for text or unread fields', fakeAsync(() => {
        const { component, group, calls } = observedForm([Promise.resolve(response(['mode', 'title']))]);
        group.get('other')!.setValue('y');
        tick();
        expect(calls.length).toBe(0);
        group.get('title')!.setValue('n');
        group.get('title')!.setValue('new');
        tick();
        expect(calls.length).toBe(0);
        expect(component.previewRequirementsStale).toBeTrue();
        expect(component.previewProgressPending).toBeFalsy();
        tick();
        expect(calls.length).toBe(0);
        component.destroy$.next();
    }));

    it('refreshes for a choice that was not read after a text edit', fakeAsync(() => {
        const { component, group, calls } = observedForm([Promise.resolve(response(['mode', 'title']))]);
        component.formRoot.model.controls[2].enum = ['x', 'y'];
        component.setPreviewRequiredFields(['mode', 'title']);
        group.get('title')!.setValue('new');
        group.get('other')!.setValue('y');
        tick();
        expect(calls.length).toBe(1);
        component.destroy$.next();
    }));

    it('refreshes after adding or removing an entry only in preview mode', fakeAsync(() => {
        const { component, calls } = observedForm([Promise.resolve(response(['mode', 'title']))]);
        component.onPreviewInteraction();
        tick();
        expect(calls.length).toBe(1);
        component.previewMode = false;
        component.onPreviewInteraction();
        tick();
        expect(calls.length).toBe(1);
        component.destroy$.next();
    }));

    it('does not refresh on navigation when requirements are up to date', fakeAsync(() => {
        const { component, calls } = observedForm([Promise.resolve(response(['mode', 'title']))]);
        component.onPreviewNavigation();
        tick();
        expect(calls.length).toBe(0);
        expect(component.previewRequirementsStale).toBeFalsy();
        component.destroy$.next();
    }));

    it('refreshes on navigation after a text edit, only in preview mode', fakeAsync(() => {
        const { component, group, calls } = observedForm([Promise.resolve(response(['mode', 'title']))]);
        group.get('title')!.setValue('new');
        tick();
        expect(calls.length).toBe(0);
        component.onPreviewNavigation();
        tick();
        expect(calls.length).toBe(1);
        expect(component.previewRequirementsStale).toBeFalse();
        component.onPreviewNavigation();
        tick();
        expect(calls.length).toBe(1);
        group.get('title')!.setValue('newer');
        component.previewMode = false;
        component.onPreviewNavigation();
        tick();
        expect(calls.length).toBe(1);
        component.destroy$.next();
    }));

    it('refreshes for an unread date selection', fakeAsync(() => {
        const { component, group, calls } = observedForm([Promise.resolve(response(['mode', 'title']))]);
        component.formRoot.model.controls[2].format = 'date';
        component.setPreviewRequiredFields(['mode', 'title']);
        group.get('other')!.setValue('2026-11-07');
        tick();
        expect(calls.length).toBe(1);
        component.destroy$.next();
    }));

    it('does not invalidate an in-flight refresh when a section opens with the same values', fakeAsync(() => {
        let resolveFirst!: (value: unknown) => void;
        const pending = new Promise(resolve => { resolveFirst = resolve; });
        const { component, calls } = observedForm([pending]);
        component.onPreviewInteraction();
        tick();
        component.onPreviewInteraction();
        resolveFirst(response(['mode', 'title']));
        tick();
        expect(calls.length).toBe(1);
        expect(component.previewRequirementsStale).toBeFalse();
        component.destroy$.next();
    }));

    it('ignores a discovery response when a read value changes while it is pending', fakeAsync(() => {
        let resolveFirst!: (value: unknown) => void;
        const pending = new Promise(resolve => { resolveFirst = resolve; });
        const { component, group, calls } = observedForm([pending, Promise.resolve(response(['mode', 'new']))]);
        group.get('mode')!.setValue('vcs');
        tick();
        group.get('mode')!.setValue('ccb');
        tick();
        expect(calls.length).toBe(1);
        resolveFirst(response(['old']));
        tick();
        expect(calls.length).toBe(2);
        expect(component.previewRequiredFields).toEqual(['mode', 'new']);
        component.destroy$.next();
    }));

    it('discards an in-flight answer after typing and refreshes on explicit retry', fakeAsync(() => {
        let resolveFirst!: (value: unknown) => void;
        const pending = new Promise(resolve => { resolveFirst = resolve; });
        const { component, group, calls } = observedForm([pending, Promise.resolve(response(['mode', 'title', 'new']))]);
        group.get('mode')!.setValue('vcs');
        tick();
        group.get('title')!.setValue('new title');
        resolveFirst(response(['old']));
        tick();
        expect(calls.length).toBe(1);
        expect(component.previewRequirementsStale).toBeTrue();
        expect(component.previewRequiredFields).toEqual(['mode', 'title']);
        void component.refreshStalePreview();
        tick();
        expect(calls.length).toBe(2);
        expect(component.previewRequiredFields).toEqual(['mode', 'new', 'title']);
        component.destroy$.next();
    }));

    it('refreshes when a previously read row appears', fakeAsync(() => {
        const { component, calls } = observedForm([Promise.resolve(response(['rows.0.name']))]);
        const rows = new FormArray([new FormGroup({ name: new FormControl('') })]);
        rows.removeAt(0);
        const group = new FormGroup({ rows });
        component.initForm(group, false);
        component.setPreviewRequiredFields(['rows.0.name']);
        rows.push(new FormGroup({ name: new FormControl('') }));
        tick();
        expect(calls.length).toBe(1);
        expect(component.previewRequirementsStale).toBeFalse();
        component.destroy$.next();
    }));

    it('keeps requirements stale after a failed refresh and sends no request in ordinary mode', fakeAsync(() => {
        spyOn(console, 'error');
        const offline = Promise.reject(new Error('offline'));
        offline.catch(() => undefined);
        const { component, group, calls } = observedForm([offline]);
        group.get('mode')!.setValue('vcs');
        tick();
        expect(component.previewRequirementsStale).toBeTrue();
        expect(component.previewRequiredFields).toEqual(['mode', 'title']);
        component.previewMode = false;
        group.get('mode')!.setValue('ccb');
        tick();
        expect(calls.length).toBe(1);
        component.destroy$.next();
    }));

    it('forwards already selected metadata from the form', async () => {
        const { component } = form([], blockParent());
        component.enableAdditionalData = true;
        component.evidenceText = 'selected proof';
        component.evidenceFiles = [];
        component.relayerAccountType = 'relayerAccount';
        component.currentRelayerAccount = '0.0.999';
        component.parent.relayerAccount = true;
        const run = jasmine.createSpy('run').and.resolveTo(response([]));
        component.calculationPreview.run = run;
        component.previewMode = true;
        await component.runPreview(true);
        expect(run.calls.mostRecent().args[5]).toEqual({ relayerAccount: '0.0.999',
            evidence: [{ dataType: 'message', data: 'selected proof' }] });
    });

    it('asks the backend for the calculation fields when the toggle is switched on', async () => {
        const { component, calls, dialogs } = form([Promise.resolve(response(['amount', 'rate'], ['rate']))], blockParent());
        await component.onPreviewModeChange(true);
        expect(calls).toEqual([{ previewFields: true, ref: { id: 'ref-2' } }]);
        expect(component.previewRequiredFields).toEqual(['amount', 'rate']);
        expect(dialogs.length).toBe(0);
        expect(component.loading).toBeFalse();
    });

    it('runs a preview instead of the evidence and relayer steps and uploads nothing', async () => {
        const { component, calls, uploads } = form([Promise.resolve(response(['amount']))], blockParent());
        component.enableAdditionalData = true;
        component.parent.relayerAccount = true;
        component.previewMode = true;
        await component.onStep();
        expect(calls).toEqual([{ previewFields: false, ref: { id: 'ref-2' } }]);
        expect(uploads).toEqual([]);
        expect(component.step).toBe('fill');
        expect(component.screen).toBe('presults');
    });

    it('shows the result on the preview results screen with the last result selected', async () => {
        const { component } = form([Promise.resolve(response(['amount']))], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(component.screen).toBe('presults');
        expect(component.previewItems).toEqual([
            { role: 'result', label: 'save', blockType: null, source: 'form', target: 'save', document: { id: 'vc-1' }, title: 'save', sub: 'save' },
        ]);
        expect(component.previewSelected?.document).toEqual({ id: 'vc-1' });
        expect(component.previewShowErrors).toBeFalse();
        expect(component.previewHeading).toBe('Preview results');
        expect(component.issues).toEqual([]);
    });

    it('selects the first final result rather than the last list item', async () => {
        const chain = [
            { source: 'save_intermediate', target: null, final: false, document: { document: { id: 'vc-1' } } },
            { source: 'math', target: 'save_final', final: true, document: { document: { id: 'vc-2' } } },
            { source: 'later', target: null, final: false, document: { document: { id: 'vc-3' } } },
        ];
        const { component } = form([Promise.resolve(response(['amount'], [], chain))], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(component.previewItems.length).toBe(3);
        expect(component.previewIndex).toBe(1);
        expect(component.previewSelected?.document).toEqual({ id: 'vc-2' });
    });

    it('keeps successful results and opens block errors only through the incomplete result action', async () => {
        const { component } = form([Promise.resolve(response(['amount'], [], saved, [scriptError]))], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(component.previewProblems).toEqual([{ blockType: 'customLogicBlock', message: 'rate is required', errorData: null }]);
        expect(component.screen).toBe('presults');
        expect(component.previewItems.length).toBe(1);
        expect(component.previewShowErrors).toBeFalse();
        expect(component.previewShowErrors).toBeFalse();
        expect(component.previewHeading).toBe('Preview results');
        component.showPreviewErrors();
        expect(component.previewShowErrors).toBeTrue();
        expect(component.previewHeading).toBe('The preview is incomplete');
        component.showPreviewResults();
        expect(component.previewShowErrors).toBeFalse();
        expect(component.previewHeading).toBe('Preview results');
        expect(component.previewItems.length).toBe(1);
        expect(component.screen).toBe('presults');
    });

    it('opens results before error details when no document was calculated', async () => {
        const { component } = form([Promise.resolve(response(['amount'], [], [], [scriptError]))], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(component.previewItems).toEqual([]);
        expect(component.previewHeading).toBe('Preview results');
        expect(component.previewShowErrors).toBeFalse();
        component.showPreviewErrors();
        expect(component.previewHeading).toBe('The preview is incomplete');
    });

    it('keeps the chain and selects the last document for an incomplete result', async () => {
        const incomplete = normalizePreviewResult({
            input: { document: { id: 'input' } }, fields: ['amount'],
            documents: [...saved, { final: false, document: { document: { id: 'last' } } }],
            incomplete: [{ blockType: 'customLogicBlock', reason: 'the operator $elemMatch' }],
        });
        const { component } = form([Promise.resolve(incomplete)], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(component.previewItems.length).toBe(3);
        expect(component.previewSelected.document).toEqual({ id: 'last' });
        expect(component.previewHeading).toBe('Preview results');
        expect(component.previewProblems[0].message).toContain('the operator $elemMatch');
        expect(component.isPreviewItemVisible(0)).toBeTrue();
        expect(component.isPreviewItemVisible(1)).toBeFalse();
        expect(component.isPreviewItemVisible(2)).toBeTrue();
        component.showPreviewErrors();
        expect(component.previewHeading).toBe('The preview is incomplete');
    });

    it('opens the results screen with the missing values when Preview answers 422', async () => {
        spyOn(console, 'error');
        const error = new HttpErrorResponse({ status: 422, error: { data: { preview: true, fields: ['amount', 'rate'], missingFields: ['rate'] } } });
        const { component } = form([Promise.reject(error), Promise.resolve(response(['amount', 'rate'], ['rate']))], blockParent());
        component.formRoot.getIssues = () => [{ path: 'rate', label: 'rate', message: 'Enter a value' }];
        component.previewMode = true;
        await component.onStep();
        expect(component.screen).toBe('results');
        expect(component.issues.map((issue: any) => issue.path)).toEqual(['rate']);
        expect(component.previewMissingFields).toEqual(['rate']);
        expect(component.resultsHeading).toBe('The calculations need 1 more value');
        expect(component.issuePill).toBe('Missing');
        expect(component.formRoot.revealErrors).toHaveBeenCalledWith(false);
    });

    it('asks for every field of the branch when Preview answers 422 and lists them all', async () => {
        spyOn(console, 'error');
        const error = new HttpErrorResponse({ status: 422, error: { data: { preview: true, fields: ['period'], missingFields: ['period'] } } });
        const { component, calls } = form([Promise.reject(error), Promise.resolve(response(['title', 'period', 'burning'], ['period', 'burning', 'rows.0.cell']))], blockParent());
        component.previewMode = true;
        component.previewRequiredFields = ['title'];
        await component.onStep();
        expect(calls.map((call) => call.previewFields)).toEqual([false, true]);
        expect(component.previewRequiredFields).toEqual(['burning', 'period', 'rows.0.cell', 'title']);
        expect(component.previewMissingFields).toEqual(['period', 'burning', 'rows.0.cell']);
        expect(component.issues.map((issue: any) => issue.path)).toEqual(['period', 'burning']);
        expect(component.screen).toBe('results');
        expect(component.loading).toBeFalse();
    });

    it('keeps what only the 422 names, such as a section that was not added, next to the fields found again', async () => {
        spyOn(console, 'error');
        const error = new HttpErrorResponse({ status: 422, error: { data: { preview: true, fields: ['monitoring'], missingFields: ['monitoring'] } } });
        const { component } = form([Promise.reject(error), Promise.resolve(response(['title'], ['monitoring.rows.0.cell']))], blockParent());
        component.previewMode = true;
        component.previewRequiredFields = ['title'];
        await component.onStep();
        expect(component.previewRequiredFields).toEqual(['monitoring', 'monitoring.rows.0.cell', 'title']);
        expect(component.previewMissingFields).toEqual(['monitoring', 'monitoring.rows.0.cell']);
        expect(component.issues.map((issue: any) => issue.path)).toEqual(['monitoring']);
        expect(component.screen).toBe('results');
    });

    it('lists a table that the 422 names while it has no rows', async () => {
        spyOn(console, 'error');
        const error = new HttpErrorResponse({ status: 422, error: { data: { preview: true, fields: ['rows'], missingFields: ['rows'] } } });
        const { component } = form([Promise.reject(error), Promise.resolve(response(['rows'], ['rows.0.cell']))], blockParent());
        component.formRoot.model = { controls: [{ name: 'rows', title: 'Rows', isArray: true, list: [], control: { disabled: false, invalid: false } }] };
        component.previewMode = true;
        await component.onStep();
        expect(component.issues.map((issue: any) => [issue.path, issue.message])).toEqual([['rows', 'Add an entry']]);
        expect(component.screen).toBe('results');
    });

    it('lists an empty table inside an existing row instead of the cells of its missing rows', async () => {
        spyOn(console, 'error');
        const error = new HttpErrorResponse({ status: 422, error: { data: { preview: true, fields: ['rows.0.values'], missingFields: ['rows.0.values'] } } });
        const { component } = form([Promise.reject(error), Promise.resolve(response(['rows.0.values.0.v'], ['rows.0.values.0.v', 'rows.0.extra.v']))], blockParent());
        const values = { name: 'values', title: 'Values', isArray: true, list: [], control: { disabled: false, invalid: false } };
        const extra = { name: 'extra', title: 'Extra', isRef: true, control: null };
        const row = { control: { disabled: false, invalid: false }, model: { controls: [values, extra] } };
        component.formRoot.model = { controls: [{ name: 'rows', title: 'Rows', isArray: true, isRef: true, list: [row], control: { disabled: false, invalid: false } }] };
        component.previewMode = true;
        await component.onStep();
        expect(component.issues.map((issue: any) => [issue.path, issue.message])).toEqual([
            ['rows.0.values', 'Add an entry'],
            ['rows.0.extra.v', 'Enter a value'],
        ]);
    });

    it('keeps the list of the 422 when asking for every field fails', async () => {
        spyOn(console, 'error');
        const error = new HttpErrorResponse({ status: 422, error: { data: { preview: true, fields: ['period'], missingFields: ['period'] } } });
        const { component, calls } = form([Promise.reject(error), Promise.reject(new HttpErrorResponse({ status: 500 }))], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(calls.map((call) => call.previewFields)).toEqual([false, true]);
        expect(component.previewRequiredFields).toEqual(['period']);
        expect(component.previewMissingFields).toEqual(['period']);
        expect(component.screen).toBe('results');
    });

    it('keeps the form open when the field discovery answers 422', async () => {
        spyOn(console, 'error');
        const error = new HttpErrorResponse({ status: 422, error: { data: { preview: true, fields: ['amount'], missingFields: ['amount'] } } });
        const { component } = form([Promise.reject(error)], blockParent());
        await component.onPreviewModeChange(true);
        expect(component.screen).toBe('form');
        expect(component.previewMissingFields).toEqual(['amount']);
    });

    it('warns on the form, not in a toast, when the field discovery stopped on an error', async () => {
        const { component } = form([Promise.resolve(response(['amount'], [], [], [scriptError]))], blockParent());
        await component.onPreviewModeChange(true);
        expect(component.previewDiscoveryWarning).toBeTrue();
        component.calculationPreview.run = () => Promise.resolve(response(['amount']));
        await component.onStep();
        expect(component.previewDiscoveryWarning).toBeFalse();
    });

    it('drops the old results and returns to the form when Preview again fails for another reason', async () => {
        spyOn(console, 'error');
        const { component } = form([Promise.resolve(response(['amount'])), Promise.reject(new HttpErrorResponse({ status: 500 }))], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(component.screen).toBe('presults');
        await component.previewAgain();
        expect(component.screen).toBe('form');
        expect(component.previewItems).toEqual([]);
        expect(component.previewProblems).toEqual([]);
    });

    it('runs the preview again from the results screen and goes back to the form when the toggle is switched off', async () => {
        const { component, calls } = form([Promise.resolve(response(['amount'])), Promise.resolve(response(['amount']))], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(component.screen).toBe('presults');
        await component.previewAgain();
        expect(calls.length).toBe(2);
        expect(component.screen).toBe('presults');
        await component.onPreviewModeChange(false);
        expect(component.screen).toBe('form');
        expect(component.previewItems).toEqual([]);
    });

    it('uses one fresh discovery and expands missing paths when stale Preview remains invalid', async () => {
        const { component, calls } = form([Promise.resolve(response(['title', 'section.amount'], ['section.amount']))], blockParent());
        component.previewMode = true;
        component.previewRequirementsStale = true;
        component.previewRequiredFields = ['title'];
        component.dataForm = { valid: false, getRawValue: () => ({ title: 'changed' }) };
        component.formRoot.expandPreviewIssues = jasmine.createSpy('expandPreviewIssues');
        component.computeRuleIssues = () => [{ path: 'section.rule', label: 'Rule', message: 'Rule failed' }];
        await component.onStep();
        expect(calls.map((call) => call.previewFields)).toEqual([true]);
        expect(component.previewMissingFields).toEqual(['section.amount']);
        expect(component.formRoot.expandPreviewIssues).toHaveBeenCalledOnceWith(['section.amount', 'section.rule']);
        expect(component.screen).toBe('results');
    });

    it('uses one discovery for an invalid stale form on Preview again', async () => {
        const { component, calls } = form([Promise.resolve(response(['title', 'rate'], ['rate']))], blockParent());
        component.previewMode = true;
        component.previewRequirementsStale = true;
        component.dataForm = { valid: false, getRawValue: () => ({ title: 'changed' }) };
        await component.previewAgain();
        expect(calls.map((call) => call.previewFields)).toEqual([true]);
        expect(component.previewMissingFields).toEqual(['rate']);
        expect(component.screen).toBe('results');
    });

    it('does not expand preview paths during ordinary validation', async () => {
        const { component, calls } = form([], blockParent());
        component.dataForm = { valid: false, getRawValue: () => ({}) };
        component.formRoot.expandPreviewIssues = jasmine.createSpy('expandPreviewIssues');
        await component.onStep();
        expect(calls).toEqual([]);
        expect(component.formRoot.expandPreviewIssues).not.toHaveBeenCalled();
    });

    it('asks for the fields again and shows the validation results when the form stays invalid on Preview again', async () => {
        const { component, calls } = form([Promise.resolve(response(['amount'])), Promise.resolve(response(['amount', 'fuel'], ['fuel']))], blockParent());
        component.previewMode = true;
        await component.onStep();
        component.dataForm = { valid: false, getRawValue: () => ({}) };
        await component.previewAgain();
        expect(calls.map((call) => call.previewFields)).toEqual([false, true]);
        expect(component.previewRequiredFields).toEqual(['amount', 'fuel']);
        expect(component.previewMissingFields).toEqual(['fuel']);
        expect(component.screen).toBe('results');
    });

    it('runs the preview when the fields asked again make an invalid form valid', async () => {
        const { component, calls } = form([Promise.resolve(response(['amount'])), Promise.resolve(response(['amount']))], blockParent());
        component.previewMode = true;
        component.previewRequiredFields = ['amount', 'rate'];
        component.dataForm = { get valid() { return !component.previewRequiredFields.includes('rate'); }, getRawValue: () => ({ amount: 5 }) };
        await component.onStep();
        expect(calls.map((call) => call.previewFields)).toEqual([true, false]);
        expect(component.previewRequiredFields).toEqual(['amount']);
        expect(component.screen).toBe('presults');
    });

    it('keeps the requirements and shows the validation results when asking for the fields again fails', async () => {
        spyOn(console, 'error');
        const { component, calls } = form([Promise.reject(new HttpErrorResponse({ status: 500 }))], blockParent());
        component.previewMode = true;
        component.previewRequiredFields = ['amount', 'rate'];
        component.dataForm = { valid: false, getRawValue: () => ({}) };
        await component.onStep();
        expect(calls.map((call) => call.previewFields)).toEqual([true]);
        expect(component.previewRequiredFields).toEqual(['amount', 'rate']);
        expect(component.screen).toBe('results');
    });

    it('does not ask for the fields on an invalid form outside Preview', async () => {
        const { component, calls } = form([], blockParent());
        component.dataForm = { valid: false, getRawValue: () => ({}) };
        await component.onStep();
        expect(calls).toEqual([]);
        expect(component.screen).toBe('results');
    });

    it('shows the same required count in the notice as the form progress', () => {
        const { component } = form([], blockParent());
        component.setPreviewRequiredFields(null);
        expect(component.previewRequiredText).toBe('Only the fields the calculations read are required.');
        component.setPreviewRequiredFields(['amount', 'rows.rate', 'rows.1.rate', 'rows.2.rate']);
        expect(component.previewRequiredText).toBe('Only the fields the calculations read are required.');
        component.onCompletionChange({ answered: 0, total: 6, sections: [] });
        expect(component.previewRequiredText).toBe('Only the 6 fields the calculations read are required.');
        component.onCompletionChange({ answered: 0, total: 1, sections: [] });
        expect(component.previewRequiredText).toBe('Only the 1 field the calculation reads is required.');
        expect(component.previewRequiredFields).toEqual(['amount', 'rows.rate', 'rows.1.rate', 'rows.2.rate']);
        component.setPreviewRequiredFields(null);
        expect(component.previewRequiredText).toBe('Only the fields the calculations read are required.');
    });

    it('goes back to a clean form when the toggle is switched off on the missing values screen', async () => {
        spyOn(console, 'error');
        const error = new HttpErrorResponse({ status: 422, error: { data: { preview: true, fields: ['rate'], missingFields: ['rate'] } } });
        const { component } = form([Promise.reject(error), Promise.resolve(response(['rate'], ['rate']))], blockParent());
        component.formRoot.getIssues = () => [{ path: 'rate', label: 'rate', message: 'Enter a value' }];
        component.previewMode = true;
        await component.onStep();
        expect(component.screen).toBe('results');
        await component.onPreviewModeChange(false);
        expect(component.screen).toBe('form');
        expect(component.issues).toEqual([]);
    });

    it('titles the input node with the schema name and the other nodes with their block', () => {
        const { component } = form([], blockParent());
        component.parent.schema = { name: 'Project description' };
        const input = { role: 'input', label: 'Your form values', blockType: null, source: null, target: null, document: {} };
        const result = { role: 'result', label: 'save', blockType: 'sendToGuardianBlock', source: 'm', target: 'save', document: {} };
        const inputView = component.toPreviewItemView(input);
        const resultView = component.toPreviewItemView(result);
        expect(inputView.title).toBe('Project description');
        expect(inputView.sub).toBe('Your form values');
        expect(resultView.title).toBe('save');
        expect(resultView.sub).toBe('sendToGuardianBlock · save');
    });

    describe('document viewers', () => {
        const chain = [
            { source: 'a', target: 'first', final: false, document: { document: { id: 'vc-1' } } },
            { source: 'b', target: 'second', final: true, document: { document: { id: 'vc-2' } } },
        ];

        it('opens a viewer only for a card that was visited and keeps it after switching away', async () => {
            const { component } = form([Promise.resolve(response(['amount'], [], chain))], blockParent());
            component.previewMode = true;
            await component.onStep();
            expect([...component.previewVisited]).toEqual([1]);
            component.selectPreviewItem(0);
            expect([...component.previewVisited].sort()).toEqual([0, 1]);
            component.selectPreviewItem(1);
            expect([...component.previewVisited].sort()).toEqual([0, 1]);
        });

        it('forgets the visited cards when the result is replaced or the toggle is switched off', async () => {
            const { component } = form([Promise.resolve(response(['amount'], [], chain))], blockParent());
            component.previewMode = true;
            await component.onStep();
            component.selectPreviewItem(0);
            await component.onPreviewModeChange(false);
            expect(component.previewVisited.size).toBe(0);
        });

        it('keeps the overlay for the open card when a hidden viewer finishes loading', async () => {
            const { component } = form([Promise.resolve(response(['amount'], [], chain))], blockParent());
            component.previewMode = true;
            await component.onStep();
            component.onPreviewViewLoadingChange(1, true);
            component.selectPreviewItem(0);
            expect(component.previewViewLoading).toBe(0);
            component.onPreviewViewLoadingChange(0, true);
            expect(component.previewViewLoading).toBe(1);
            component.onPreviewViewLoadingChange(1, false);
            expect(component.previewViewLoading).toBe(1);
            component.onPreviewViewLoadingChange(0, false);
            expect(component.previewViewLoading).toBe(0);
            component.selectPreviewItem(1);
            expect(component.previewViewLoading).toBe(0);
        });

        it('flips between Document and JSON without touching the visited cards', async () => {
            const { component } = form([Promise.resolve(response(['amount'], [], chain))], blockParent());
            component.previewMode = true;
            await component.onStep();
            component.setDocView('preview', 'json');
            expect(component.previewTab).toBe('json');
            expect(component.docTab).toBe('doc');
            component.setDocView('submitted', 'json');
            expect(component.docTab).toBe('json');
            expect([...component.previewVisited]).toEqual([1]);
        });
    });

    describe('refreshing the issues', () => {
        const missing = (fields: string[]) => new HttpErrorResponse({ status: 422, error: { data: { preview: true, fields, missingFields: fields } } });

        it('refreshes the issues once for a 422 that brings no new requirements', async () => {
            spyOn(console, 'error');
            const { component } = form([Promise.reject(missing(['rate'])), Promise.resolve(response(['rate'], ['rate']))], blockParent());
            const getIssues = spyOn(component.formRoot, 'getIssues').and.returnValue([]);
            const detect = spyOn(component.changeDetectorRef, 'detectChanges');
            component.previewMode = true;
            component.previewRequiredFields = ['rate'];
            await component.runPreview(false);
            expect(component.screen).toBe('results');
            expect(getIssues).toHaveBeenCalledTimes(1);
            expect(detect).not.toHaveBeenCalled();
        });

        it('lets the form take new requirements before listing what is missing', async () => {
            spyOn(console, 'error');
            const { component } = form([Promise.reject(missing(['rate'])), Promise.resolve(response(['rate'], ['rate']))], blockParent());
            const detect = spyOn(component.changeDetectorRef, 'detectChanges');
            component.previewMode = true;
            component.previewRequiredFields = ['amount'];
            await component.runPreview(false);
            expect(detect).toHaveBeenCalledTimes(1);
            expect(component.previewRequiredFields).toEqual(['rate']);
        });

        it('refreshes the results only when the form stops rendering', () => {
            const { component } = form([], blockParent());
            const refresh = spyOn<any>(component, 'refreshIssues');
            component.previewMode = true;
            component.screen = 'results';
            component.onPreviewRenderingChange(false);
            expect(refresh).not.toHaveBeenCalled();
            component.onPreviewRenderingChange(true);
            component.onPreviewRenderingChange(true);
            expect(refresh).not.toHaveBeenCalled();
            component.onPreviewRenderingChange(false);
            expect(refresh).toHaveBeenCalledTimes(1);
        });
    });

    describe('missing fields the form has no control for', () => {
        const schema = {
            getField: (path: string) => ({
                'group': { description: 'Group', name: 'group' },
                'group.rows': { title: 'Rows', name: 'rows' },
                'group.rows.rate': { name: 'rate' },
            } as any)[path] ?? null,
        };

        it('labels each segment with its field description, title or name and a row as #n', () => {
            const { component } = form([], blockParent());
            component.parent.schema = schema;
            expect(component.missingFieldLabel('group.rows.1.rate')).toBe('Group / Rows / #2 / rate');
        });

        it('keeps the raw segment when the schema has no such field', () => {
            const { component } = form([], blockParent());
            component.parent.schema = schema;
            expect(component.missingFieldLabel('group.other')).toBe('Group / other');
        });
    });

    it('names the preview step in the stepper and has no Submitted step', () => {
        const { component } = form([], blockParent());
        component.previewMode = true;
        expect(component.stepperSteps.map((step: any) => step.label)).toEqual(['Fill form', 'Calculation preview']);
        component.screen = 'presults';
        expect(component.currentStepId).toBe('results');
        component.previewMode = false;
        expect(component.stepperSteps.map((step: any) => step.label)).toEqual(['Fill form', 'Validation results', 'Submitted']);
    });

    it('keeps ordinary file handling and payload without preview flags when the toggle is off', async () => {
        const { component, calls, uploads } = form([], blockParent());
        component.previewMode = false;
        const send = spyOn(component.policyEngineService, 'setBlockDataWithResult').and.callThrough();
        await component.onStep();
        expect(calls).toEqual([]);
        expect(uploads).toEqual(['tables', 'geo', 'submit']);
        const payload = send.calls.mostRecent().args[2];
        expect(payload).toEqual(jasmine.objectContaining({ document: { amount: 5 } }));
        expect(Object.prototype.hasOwnProperty.call(payload, 'preview')).toBeFalse();
        expect(Object.prototype.hasOwnProperty.call(payload, 'previewFields')).toBeFalse();
    });

    it('saves a draft the normal way while the toggle is on', async () => {
        const { component, calls, uploads } = form([], blockParent());
        component.previewMode = true;
        await component.onStep(true);
        expect(calls).toEqual([]);
        expect(uploads).toEqual(['tables', 'geo', 'submit']);
    });

    it('clears the field list when the toggle is switched off', async () => {
        const { component } = form([], blockParent());
        component.previewMode = true;
        component.previewRequiredFields = ['amount'];
        await component.onPreviewModeChange(false);
        expect(component.previewRequiredFields).toBeNull();
    });

    it('does not ask for fields after loaded values when the toggle is off, and preset alone asks nothing', async () => {
        const parent = blockParent();
        parent.changeDetectorRef = { detectChanges: () => undefined };
        parent.form = { detectChanges: () => undefined };
        const { component, calls } = form([], parent);
        component.onPresetApplied();
        component.previewMode = true;
        parent.preset({ amount: 7 });
        await settle();
        expect(calls).toEqual([]);
    });

    it('blocks Preview controls for network or form rendering only in Preview', () => {
        const { component } = form([], blockParent());
        component.previewRendering = false;
        component.previewBusyHold = false;
        component.changeDetectorRef = { markForCheck: jasmine.createSpy('markForCheck') };
        component.previewMode = true;
        component.onPreviewRenderingChange(true);
        expect(component.isPreviewBusy).toBeTrue();
        expect(component.ifDisabledBtn({ id: 'cancel' })).toBeFalse();
        expect(component.ifDisabledBtn({ id: 'submit' })).toBeTrue();
        component.onPreviewRenderingChange(false);
        expect(component.isPreviewBusy).toBeFalse();
        component.loading = true;
        expect(component.isPreviewBusy).toBeTrue();
        component.previewMode = false;
        component.onPreviewRenderingChange(true);
        expect(component.isPreviewBusy).toBeFalse();
        expect(component.ifDisabledBtn({ id: 'cancel' })).toBeFalse();
    });

    it('does not open a late Preview result after the form closes', async () => {
        let resolve!: (value: unknown) => void;
        const responsePromise = new Promise<unknown>(done => resolve = done);
        const state = form([responsePromise], blockParent());
        state.component.previewMode = true;
        const pending = state.component.runPreview(false);
        state.component.ngOnDestroy();
        resolve(response(['amount']));
        await pending;
        expect(state.component.screen).toBe('form');
    });

    it('keeps Preview controls busy across short gaps between loading phases', fakeAsync(() => {
        const { component } = form([], blockParent());
        component.previewRendering = false;
        component.changeDetectorRef = { markForCheck: jasmine.createSpy('markForCheck') };
        component.previewMode = true;
        component.loading = true;
        component.ngDoCheck();
        component.loading = false;
        component.ngDoCheck();
        expect(component.isPreviewBusy).toBeTrue();
        tick(200);
        component.previewRendering = true;
        component.ngDoCheck();
        tick(200);
        component.previewRendering = false;
        component.ngDoCheck();
        tick(299);
        expect(component.isPreviewBusy).toBeTrue();
        tick(1);
        expect(component.isPreviewBusy).toBeFalse();
        component.ngOnDestroy();
    }));

    it('does not hold controls busy outside Preview', fakeAsync(() => {
        const { component } = form([], blockParent());
        component.previewRendering = false;
        component.loading = true;
        component.ngDoCheck();
        expect(component.isPreviewBusy).toBeFalse();
        component.loading = false;
        component.ngDoCheck();
        expect(component.isPreviewBusy).toBeFalse();
        expect(Reflect.get(component, 'previewBusyTimer')).toBeFalsy();
        component.ngOnDestroy();
    }));

    it('keeps the dirty Preview form close confirmation available during network loading', () => {
        const { component } = form([], blockParent());
        component.previewMode = true;
        component.loading = true;
        component.dataForm = { dirty: true };
        const decision = new Subject<string>();
        component.dialogService = { open: jasmine.createSpy('open').and.returnValue({ onClose: decision }) };
        component.dialogRef = { close: jasmine.createSpy('close') };
        component.onClose();
        expect(component.dialogService.open).toHaveBeenCalledTimes(1);
        decision.next('Confirm');
        expect(component.dialogRef.close).toHaveBeenCalledWith(null);
    });

    for (const preview of [false, true]) {
        it(`asks before closing a clean form during loading with Preview ${preview}`, () => {
            const { component } = form([], blockParent());
            component.previewMode = preview;
            component.previewRendering = preview;
            component.dataForm = { dirty: false };
            const decision = new Subject<string>();
            component.dialogService = { open: jasmine.createSpy('open').and.returnValue({ onClose: decision }) };
            component.dialogRef = { close: jasmine.createSpy('close') };
            component.onClose();
            if (preview) {
                expect(component.dialogService.open).toHaveBeenCalledTimes(1);
                expect(component.dialogRef.close).not.toHaveBeenCalled();
                decision.next('Confirm');
            } else {
                expect(component.dialogService.open).not.toHaveBeenCalled();
            }
            expect(component.dialogRef.close).toHaveBeenCalledOnceWith(null);
        });
    }

    it('runs a preview from the form with its own document reference', async () => {
        const { component, calls } = form([Promise.resolve(response(['amount']))], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(calls).toEqual([{ previewFields: false, ref: { id: 'ref-2' } }]);
        expect(component.screen).toBe('presults');
        expect(component.previewItems.map((item: any) => item.document)).toEqual([{ id: 'vc-1' }]);
        component.ngDoCheck();
        expect(component.getButtonName({ id: 'submit' })).toBe('Preview');
    });

    it('renames the submit button only while the buttons are shown', async () => {
        let answer: (value: unknown) => void = () => undefined;
        const { component } = form([new Promise((resolve) => { answer = resolve; })], blockParent());
        component.ngDoCheck();
        const pending = component.onPreviewModeChange(true);
        component.ngDoCheck();
        expect(component.loading).toBeTrue();
        expect(component.getButtonName({ id: 'submit' })).toBe('Validate & Create');
        answer(response(['amount']));
        await pending;
        component.ngDoCheck();
        expect(component.getButtonName({ id: 'submit' })).toBe('Preview');
        component.loading = true;
        component.ngDoCheck();
        expect(component.getButtonName({ id: 'submit' })).toBe('Preview');
        component.loading = false;
        await component.onPreviewModeChange(false);
        component.ngDoCheck();
        expect(component.getButtonName({ id: 'submit' })).toBe('Validate & Create');
        component.ngOnDestroy();
    });

    it('asks for the calculation fields again when the rebuilt form reports new loaded values', async () => {
        const { component, calls } = form([Promise.resolve(response(['amount', 'fuel'], ['fuel']))], blockParent());
        component.previewMode = true;
        component.previewRequiredFields = ['amount', 'rate'];
        component.onPresetApplied();
        await settle();
        expect(calls).toEqual([{ previewFields: true, ref: { id: 'ref-2' } }]);
        expect(component.previewRequiredFields).toEqual(['amount', 'fuel']);
    });

    it('ignores an older answer after another operation cleared loading and Preview was switched off and on', async () => {
        let answerA: (value: unknown) => void = () => undefined;
        let answerB: (value: unknown) => void = () => undefined;
        const results = [new Promise((resolve) => { answerA = resolve; }), new Promise((resolve) => { answerB = resolve; })];
        const { component } = form(results, blockParent());
        const first = component.onPreviewModeChange(true);
        component.loading = false;
        await component.onPreviewModeChange(false);
        const second = component.onPreviewModeChange(true);
        answerA(response(['rate'], ['rate'], saved, [scriptError]));
        await first;
        expect(component.previewRequiredFields).toBeNull();
        expect(component.previewDiscoveryWarning).toBeFalse();
        expect(component.loading).toBeTrue();
        answerB(response(['fuel'], ['fuel']));
        await second;
        expect(component.previewRequiredFields).toEqual(['fuel']);
        expect(component.loading).toBeFalse();
    });

    it('drops an older form answer once the block loads new values, before the form is rebuilt', async () => {
        let answerA: (value: unknown) => void = () => undefined;
        const parent = blockParent();
        parent.changeDetectorRef = { detectChanges: () => undefined };
        parent.form = { detectChanges: () => undefined };
        const { component } = form([new Promise((resolve) => { answerA = resolve; })], parent);
        component.previewMode = true;
        component.previewRequiredFields = ['amount'];
        const pending = component.runPreview(true);
        parent.preset({ amount: 9 });
        answerA(response(['rate'], ['rate']));
        await pending;
        expect(component.previewRequiredFields).toEqual(['amount']);
        expect(component.loading).toBeTrue();
    });

    it('ignores a late answer in the form after the toggle was switched off', async () => {
        let answer: (value: unknown) => void = () => undefined;
        const { component, dialogs } = form([new Promise((resolve) => { answer = resolve; })], blockParent());
        const pending = component.onPreviewModeChange(true);
        await component.onPreviewModeChange(false);
        answer(response(['amount']));
        await pending;
        expect(component.previewMode).toBeFalse();
        expect(component.previewRequiredFields).toBeNull();
        expect(dialogs.length).toBe(0);
        expect(component.getButtonName({ id: 'submit' })).toBe('Validate & Create');
    });

    for (const discovery of [false, true]) {
        it(`keeps the loading indicator active while the form waits, discovery=${discovery}`, async () => {
            let answer: (value: unknown) => void = () => undefined;
            const responsePromise = new Promise(resolve => { answer = resolve; });
            const { component, dialogs } = form([responsePromise], blockParent());
            if (!discovery) component.previewMode = true;
            const pending = discovery ? component.onPreviewModeChange(true) : component.onStep();
            await settle();
            expect(component.loading).toBeTrue();
            expect(dialogs.length).toBe(0);
            answer(response(['amount']));
            await pending;
            expect(component.loading).toBeFalse();
            expect(component.screen).toBe(discovery ? 'form' : 'presults');
        });
    }

    it('warns calmly when field discovery stopped on an error', async () => {
        const state = form([Promise.resolve(response(['amount'], ['amount'], [], [scriptError]))], blockParent());
        await state.component.onPreviewModeChange(true);
        expect(state.component.previewRequiredFields).toEqual(['amount']);
        expect(state.component.previewDiscoveryWarning).toBeTrue();
        expect(state.component.screen).toBe('form');
        expect(state.component.loading).toBeFalse();
    });

    it('shows no discovery warning when field discovery finished cleanly', async () => {
        const state = form([Promise.resolve(response(['amount'], ['amount']))], blockParent());
        await state.component.onPreviewModeChange(true);
        expect(state.component.previewDiscoveryWarning).toBeFalse();
    });

    it('updates missing fields after API rejection and opens the missing values screen', async () => {
        const failure = new HttpErrorResponse({ status: 422, error: { data: {
            preview: true, fields: ['amount', 'bonus'], missingFields: ['bonus']
        } } });
        const state = form([Promise.reject(failure), Promise.resolve(response(['amount', 'bonus'], ['bonus']))], blockParent());
        const { component } = state;
        component.previewMode = true;
        component.previewRequiredFields = ['amount'];
        spyOn(console, 'error');
        await component.onStep();
        expect(component.previewRequiredFields).toEqual(['amount', 'bonus']);
        expect(component.screen).toBe('results');
        expect(component.loading).toBeFalse();
        expect(state.calls.map((call) => call.previewFields)).toEqual([false, true]);
    });

    it(`keeps the server's indexed PEt error when requirements stay unchanged`, async () => {
        const path = 'vcs_project_description.estimatedGHG.exAnteCSVArea.0.PEt';
        const field = 'vcs_project_description.estimatedGHG.exAnteCSVArea.PEt';
        const failure = new HttpErrorResponse({ status: 422, error: {
            statusCode: 422,
            message: 'Missing calculation inputs',
            data: { preview: true, fields: [field], missingFields: [path] }
        } });
        const state = form([Promise.reject(failure), Promise.resolve(response([field], [path]))], blockParent());
        const { component } = state;
        const values = { vcs_project_description: { estimatedGHG: {
            exAnteCSVArea: [{ PBt: 0.1, LKt: 2, PEt: null, UNCt: 0.05 }]
        } } };
        component.dataForm.getRawValue = () => values;
        component.previewMode = true;
        const required = [path, field];
        component.previewRequiredFields = required;
        spyOn(console, 'error');
        await component.runPreview(false);
        expect(component.previewMissingFields).toEqual([path]);
        expect(component.previewRequiredFields).toEqual(required);
        expect(component.dataForm.getRawValue()).toEqual(values);
        expect(component.loading).toBeFalse();
        expect(component.screen).toBe('results');
        await component.onPreviewModeChange(false);
        expect(component.previewMissingFields).toEqual([]);
        expect(component.previewRequiredFields).toBeNull();
        component.destroy$.next();
    });

    it('ignores late missing-field rejection after switching preview off', async () => {
        let reject: (error: unknown) => void = () => undefined;
        const pendingResult = new Promise((_resolve, fail) => { reject = fail; });
        const { component, dialogs } = form([pendingResult], blockParent());
        spyOn(console, 'error');
        const pending = component.onPreviewModeChange(true);
        await component.onPreviewModeChange(false);
        reject(new HttpErrorResponse({ status: 422, error: { data: {
            preview: true, fields: ['amount'], missingFields: ['amount']
        } } }));
        await pending;
        expect(component.previewRequiredFields).toBeNull();
        expect(dialogs.length).toBe(0);
        expect(component.loading).toBeFalse();
    });

    it('keeps discovery requirements and normal validity gating, then takes the latest requirements', async () => {
        const results = [Promise.resolve(response(['amount', 'bonus'], ['bonus'])),
            Promise.resolve(response(['amount', 'bonus'], ['bonus'])),
            Promise.resolve(response(['later']))];
        const state = form(results, blockParent());
        const { component, dialogs } = state;
        component.parent.isLocalUser = true;
        component.ifRelayerAccountDisabled = () => false;
        await component.onPreviewModeChange(true);
        expect(component.previewRequiredFields).toEqual(['amount', 'bonus']);
        component.dataForm.valid = false;
        expect(component.ifDisabledBtn({ id: 'submit' })).toBeFalse();
        await component.onStep();
        expect(component.screen).toBe('results');
        expect(component.formRoot.revealErrors).toHaveBeenCalledWith(false);
        expect(state.calls.length).toBe(2);
        expect(dialogs.length).toBe(0);
        component.dataForm.valid = true;
        expect(component.ifDisabledBtn({ id: 'submit' })).toBeFalse();
        await component.onStep();
        expect(state.calls.map((call) => call.previewFields)).toEqual([true, true, false]);
        expect(component.previewRequiredFields).toEqual(['later']);
        expect(component.screen).toBe('presults');
    });

    it('keeps ordinary validation after switching preview off', async () => {
        const state = form([Promise.resolve(response(['amount']))], blockParent());
        await state.component.onPreviewModeChange(true);
        expect(state.component.previewRequiredFields).toEqual(['amount']);
        await state.component.onPreviewModeChange(false);
        expect(state.component.previewRequiredFields).toBeNull();
        state.component.dataForm.valid = false;
        state.component.parent.isLocalUser = true;
        state.component.ifRelayerAccountDisabled = () => false;
        expect(state.component.ifDisabledBtn({ id: 'submit' })).toBeFalse();
        await state.component.onStep();
        expect(state.component.screen).toBe('results');
        expect(state.component.formRoot.revealErrors).toHaveBeenCalledWith(false);
        expect(state.calls.length).toBe(1);
        expect(state.dialogs.length).toBe(0);
    });

    it('persists both toggle values using the current user/policy/block', async () => {
        const { component } = form([Promise.resolve(response(['amount']))], blockParent());
        await component.onPreviewModeChange(true);
        await component.onPreviewModeChange(false);
        expect(component.calculationPreview.saveMode.calls.allArgs()).toEqual([
            ['user-1', 'policy-1', 'block-1', true], ['user-1', 'policy-1', 'block-1', false]
        ]);
        expect(component.previewRequiredFields).toBeNull();
    });

    it('restores a saved flag only when the real form is ready and discovers fresh requirements once', async () => {
        const { component, calls, dialogs } = form([Promise.resolve(response(['fresh']))], blockParent());
        component.parent.schema = {};
        component.calculationPreview.loadMode.and.returnValue(true);
        const group = new FormGroup({ amount: new FormControl(5) });
        const run = spyOn(component.calculationPreview, 'run').and.callThrough();
        component.initForm(group, false);
        expect(component.calculationPreview.loadMode).not.toHaveBeenCalled();
        component.initForm(group);
        await Promise.resolve();
        expect(component.previewMode).toBeTrue();
        expect(component.previewRequiredFields).toEqual(['fresh']);
        expect(component.calculationPreview.loadMode).toHaveBeenCalledOnceWith('user-1', 'policy-1', 'block-1');
        expect(run).toHaveBeenCalledWith('policy-1', 'block-1', { amount: 5 },
            { id: 'ref-2' }, true, { relayerAccount: null, evidence: undefined });
        expect(dialogs.length).toBe(0);
        component.initForm(group);
        await Promise.resolve();
        expect(calls.length).toBe(1);
        expect(group.getRawValue()).toEqual({ amount: 5 });
        await component.onPreviewModeChange(false);
        component.initForm(group);
        expect(calls.length).toBe(1);
        expect(component.previewRequiredFields).toBeNull();
        component.destroy$.next();
    });

    it('does not start saved preview for a disabled form', () => {
        const { component, calls } = form([], blockParent());
        component.parent.schema = {};
        component.parent.disabled = true;
        component.calculationPreview.loadMode.and.returnValue(true);
        component.initForm(new FormGroup({ amount: new FormControl(5) }));
        expect(component.calculationPreview.loadMode).not.toHaveBeenCalled();
        expect(component.previewMode).toBeFalse();
        expect(calls.length).toBe(0);
        component.destroy$.next();
    });

    it('keeps the normal mode and sends no discovery when no saved flag exists', () => {
        const { component, calls } = form([], blockParent());
        component.parent.schema = {};
        component.initForm(new FormGroup({ amount: new FormControl(5) }));
        expect(component.previewMode).toBeFalse();
        expect(component.previewRequiredFields).toBeNull();
        expect(calls.length).toBe(0);
        expect(component.calculationPreview.saveMode).not.toHaveBeenCalled();
        component.destroy$.next();
    });

    it('does not restore a preview flag for a Request Addon form', () => {
        const { component, calls } = form([], { user: { id: 'user-1' }, id: 'addon-1', policyId: 'policy-1', schema: {} });
        component.calculationPreview.loadMode.and.returnValue(true);
        component.initForm(new FormGroup({ amount: new FormControl(5) }));
        expect(component.calculationPreview.loadMode).not.toHaveBeenCalled();
        expect(component.previewMode).toBeFalse();
        expect(calls.length).toBe(0);
        component.destroy$.next();
    });

    it('offers the toggle only for a Request document block', () => {
        expect(form([], blockParent()).component.previewAvailable).toBeTrue();
        expect(form([], { id: 'addon-1' }).component.previewAvailable).toBeFalse();
    });

    it('keeps every missing address without opening results', async () => {
        const error = new HttpErrorResponse({ status: 422, error: { data: {
            preview: true, fields: ['amount'], missingFields: ['rows.1.bonus','rows.3.rate']
        } } });
        const { component, dialogs } = form([Promise.reject(error), Promise.resolve(response(['amount'], ['rows.1.bonus', 'rows.3.rate']))], blockParent());
        component.previewMode = true;
        component.previewRequiredFields = ['amount'];
        await component.runPreview(false);
        expect(component.previewMissingFields).toEqual(['rows.1.bonus','rows.3.rate']);
        expect(component.previewRequiredFields).toEqual(['amount','rows.1.bonus','rows.3.rate']);
        expect(component.dataForm.getRawValue()).toEqual({ amount: 5 });
        expect(dialogs.length).toBe(0);
        component.destroy$.next();
    });

    it('keeps all branches and resets intermediate expansion for a new preview', async () => {
        const result = normalizePreviewResult({ sameSchema: true, input: { document: { id: 'input' } }, documents: [
            { final: false, document: { document: { id: 'middle' } } },
            { final: true, sameSchema: true, document: { document: { id: 'matching' } } },
            { final: true, sameSchema: false, document: { document: { id: 'other' } } },
        ] });
        const { component } = form([Promise.resolve(result), Promise.resolve(result)], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(component.previewItems.length).toBe(4);
        expect(component.previewSelected.document).toEqual({ id: 'matching' });
        expect(component.isPreviewItemVisible(0)).toBeTrue();
        expect(component.isPreviewItemVisible(1)).toBeFalse();
        expect(component.isPreviewItemVisible(2)).toBeTrue();
        expect(component.isPreviewItemVisible(3)).toBeTrue();
        component.previewExpanded = true;
        expect(component.isPreviewItemVisible(1)).toBeTrue();
        await component.onStep();
        expect(component.previewExpanded).toBeFalse();
    });

    it('opens the input when no saved document is returned', async () => {
        const result = normalizePreviewResult({ input: { document: { id: 'input' } }, errors: [scriptError] });
        const { component } = form([Promise.resolve(result)], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(component.previewSelected.document).toEqual({ id: 'input' });
        expect(component.previewHeading).toBe('Preview results');
        expect(component.previewShowErrors).toBeFalse();
        component.showPreviewErrors();
        expect(component.previewHeading).toBe('The preview is incomplete');
    });

    it('selects the last returned unsaved output when no final exists', async () => {
        const unsaved = { credentialSubject: [{ type: 'Output', total: 6 }] };
        const result = normalizePreviewResult({ input: { document: { id: 'input' } }, documents: [
            { source: 'save', final: false, document: { id: 'stored-record', document: { id: 'saved' } } },
            { source: 'math', final: false, document: { document: unsaved } },
        ] });
        const { component } = form([Promise.resolve(result)], blockParent());
        component.previewMode = true;
        await component.onStep();
        expect(component.previewSelected.document).toEqual(unsaved);
        expect(component.previewSelected.final).toBeFalse();
        expect(component.isPreviewItemVisible(2)).toBeTrue();
        expect(component.isPreviewItemVisible(1)).toBeFalse();
        component.previewExpanded = true;
        component.selectPreviewItem(1);
        expect(component.previewSelected.document).toEqual({ id: 'saved' });
    });

});
