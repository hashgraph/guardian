import { FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { RequestDocumentBlockComponent } from './request-document-block.component';
import { RequestDocumentBlockDialog } from './dialog/request-document-block-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import { CalculationPreviewService, normalizePreviewResult } from 'src/app/services/calculation-preview.service';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';

describe('request document preview wiring', () => {
    const saved = [{ source: 'form', target: 'save', document: { document: { id: 'vc-1' } } }];
    const scriptError = { message: 'rate is required', blockType: 'customLogicBlock', errorData: null };
    const response = (fields: string[], missingFields: string[] = [], documents: unknown[] = saved, errors: unknown[] = []) =>
        normalizePreviewResult({ fields, missingFields, documents, errors });

    const preview = (results: Promise<unknown>[]) => {
        const calls: { previewFields: boolean; ref: unknown }[] = [];
        const errors: unknown[] = [];
        const warnings: unknown[] = [];
        return {
            calls,
            errors,
            warnings,
            service: {
                run: (_policyId: string, _blockId: string, _value: unknown, ref: unknown, previewFields: boolean) => {
                    calls.push({ previewFields, ref });
                    return results.shift();
                },
                loadMode: jasmine.createSpy('loadMode').and.returnValue(false),
                saveMode: jasmine.createSpy('saveMode'),
                getInputValidation: CalculationPreviewService.prototype.getInputValidation,
                updateRequiredFields: CalculationPreviewService.prototype.updateRequiredFields,
                getViewerDocuments: (result: any) => result.documents.map((item: any, index: number) => ({
                    label: `${index + 1}. ${item.target}`,
                    document: item.document.document,
                })),
                showErrors: (result: any) => errors.push(...result.errors),
                showDiscoveryWarning: (result: any) => {
                    if (result.errors.length || result.incomplete.length) {
                        warnings.push(result);
                    }
                },
            },
        };
    };

    const page = (results: Promise<unknown>[]) => {
        const component = Object.create(RequestDocumentBlockComponent.prototype) as any;
        const fake = preview(results);
        const uploads: string[] = [];
        const dialogs: { type: unknown; config: any }[] = [];
        component.calculationPreview = fake.service;
        component.dataForm = { valid: true, getRawValue: () => ({ amount: 5 }) };
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
        component.getAutosaveId = () => 'autosave';
        component.policyEngineService = { setBlockDataWithResult: () => ({ pipe: () => ({ subscribe: () => uploads.push('submit') }) }) };
        component.policyTest = { state: { captureNextFormSubmit: false } };
        component.stepper = [true, false, false];
        component.enableAdditionalData = true;
        component.relayerAccount = true;
        component.user = { id: 'user-1' };
        component.destroy$ = new Subject<void>();
        component.policyId = 'policy-1';
        component.id = 'block-1';
        component.ref = { id: 'ref-1' };
        component.disabled = false;
        component.loading = false;
        component.previewMode = false;
        component.previewRequiredFields = null;
        return { component, calls: fake.calls, errors: fake.errors, warnings: fake.warnings, uploads, dialogs };
    };

    it('asks the backend for the calculation fields when the toggle is switched on', async () => {
        const { component, calls, dialogs } = page([Promise.resolve(response(['amount', 'rate'], ['rate']))]);
        await component.onPreviewModeChange(true);
        expect(calls).toEqual([{ previewFields: true, ref: { id: 'ref-1' } }]);
        expect(component.previewRequiredFields).toEqual(['amount', 'rate']);
        expect(dialogs.length).toBe(0);
        expect(component.loading).toBeFalse();
    });

    it('runs a preview instead of the evidence and relayer steps and uploads nothing', async () => {
        const { component, calls, uploads, dialogs } = page([Promise.resolve(response(['amount']))]);
        component.previewMode = true;
        await component.onStep();
        expect(calls).toEqual([{ previewFields: false, ref: { id: 'ref-1' } }]);
        expect(uploads).toEqual([]);
        expect(component.isStep(0)).toBeTrue();
        expect(dialogs.length).toBe(1);
    });

    it('opens the result in the normal document viewer', async () => {
        const { component, dialogs } = page([Promise.resolve(response(['amount']))]);
        component.previewMode = true;
        component.dryRun = true;
        await component.onStep();
        expect(dialogs.length).toBe(1);
        expect(dialogs[0].type).toBe(VCViewerDialog);
        expect(dialogs[0].config.data.type).toBe('VC');
        expect(dialogs[0].config.data.viewDocument).toBeTrue();
        expect(dialogs[0].config.data.dryRun).toBeTrue();
        expect(dialogs[0].config.data.document).toEqual({ id: 'vc-1' });
        expect(dialogs[0].config.data.previewDocuments).toEqual([{ label: '1. save', document: { id: 'vc-1' } }]);
    });

    it('shows block errors and opens the documents that were still calculated', async () => {
        const { component, errors, dialogs } = page([Promise.resolve(response(['amount'], [], saved, [scriptError]))]);
        component.previewMode = true;
        await component.onStep();
        expect(errors).toEqual([scriptError]);
        expect(dialogs.length).toBe(1);
    });

    it('shows block errors and opens nothing when no document was calculated', async () => {
        const { component, errors, dialogs } = page([Promise.resolve(response(['amount'], [], [], [scriptError]))]);
        component.previewMode = true;
        await component.onStep();
        expect(errors).toEqual([scriptError]);
        expect(dialogs.length).toBe(0);
    });

    it('keeps ordinary file handling and payload without preview flags when the toggle is off', async () => {
        const { component, calls, uploads } = page([]);
        component.previewMode = false;
        component.enableAdditionalData = false;
        component.relayerAccount = false;
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
        const { component, calls, uploads } = page([]);
        component.previewMode = true;
        component.enableAdditionalData = false;
        component.relayerAccount = false;
        await component.onStep(true);
        expect(calls).toEqual([]);
        expect(uploads).toEqual(['tables', 'geo', 'submit']);
    });

    it('ignores an answer that arrives after the toggle was switched off', async () => {
        let answer: (value: unknown) => void = () => undefined;
        const { component, dialogs } = page([new Promise((resolve) => { answer = resolve; })]);
        const pending = component.onPreviewModeChange(true);
        await component.onPreviewModeChange(false);
        answer(response(['amount']));
        await pending;
        expect(component.previewMode).toBeFalse();
        expect(component.previewRequiredFields).toBeNull();
        expect(dialogs.length).toBe(0);
    });

    it('clears the field list when the toggle is switched off', async () => {
        const { component } = page([]);
        component.previewMode = true;
        component.previewRequiredFields = ['amount'];
        await component.onPreviewModeChange(false);
        expect(component.previewRequiredFields).toBeNull();
    });

    const dialog = (results: Promise<unknown>[], parent: unknown) => {
        const component = Object.create(RequestDocumentBlockDialog.prototype) as any;
        const fake = preview(results);
        const dialogs: { type: unknown; config: any }[] = [];
        component.calculationPreview = fake.service;
        component.parent = parent;
        component.destroy$ = new Subject<void>();
        component.dataForm = { valid: true, getRawValue: () => ({ amount: 5 }) };
        component.dialogService = { open: (type: unknown, config: any) => dialogs.push({ type, config }) };
        component.stepper = [true, false, false];
        component.enableAdditionalData = false;
        component.buttonNames = { submit: 'Validate & Create' };
        component.loading = false;
        component.previewMode = false;
        component.previewRequiredFields = null;
        return { component, calls: fake.calls, errors: fake.errors, warnings: fake.warnings, dialogs };
    };

    const pageParent = () => {
        const parent = Object.create(RequestDocumentBlockComponent.prototype) as any;
        parent.user = { id: 'user-1' };
        parent.id = 'block-1';
        parent.policyId = 'policy-1';
        parent.disabled = false;
        parent.relayerAccount = false;
        parent.getRef = () => ({ id: 'ref-2' });
        return parent;
    };

    it('runs a preview from the dialog with its own document reference', async () => {
        const { component, calls, dialogs } = dialog([Promise.resolve(response(['amount']))], pageParent());
        component.previewMode = true;
        await component.onStep();
        expect(calls).toEqual([{ previewFields: false, ref: { id: 'ref-2' } }]);
        expect(dialogs.length).toBe(1);
        expect(dialogs[0].type).toBe(VCViewerDialog);
        expect(dialogs[0].config.data.previewDocuments).toEqual([{ label: '1. save', document: { id: 'vc-1' } }]);
        expect(component.getButtonName({ id: 'submit' })).toBe('Preview');
    });

    it('ignores a late answer in the dialog after the toggle was switched off', async () => {
        let answer: (value: unknown) => void = () => undefined;
        const { component, dialogs } = dialog([new Promise((resolve) => { answer = resolve; })], pageParent());
        const pending = component.onPreviewModeChange(true);
        await component.onPreviewModeChange(false);
        answer(response(['amount']));
        await pending;
        expect(component.previewRequiredFields).toBeNull();
        expect(dialogs.length).toBe(0);
        expect(component.getButtonName({ id: 'submit' })).toBe('Validate & Create');
    });

    for (const kind of ['page', 'dialog']) {
        for (const discovery of [false, true]) {
            it(`keeps the loading indicator active while ${kind} waits, discovery=${discovery}`, async () => {
                let answer: (value: unknown) => void = () => undefined;
                const responsePromise = new Promise(resolve => { answer = resolve; });
                const { component, dialogs } = kind === 'page' ? page([responsePromise]) : dialog([responsePromise], pageParent());
                if (!discovery) component.previewMode = true;
                const pending = discovery ? component.onPreviewModeChange(true) : component.onStep();
                expect(component.loading).toBeTrue();
                expect(dialogs.length).toBe(0);
                answer(response(['amount']));
                await pending;
                expect(component.loading).toBeFalse();
                expect(dialogs.length).toBe(discovery ? 0 : 1);
            });
        }

        it(`warns calmly in the ${kind} when field discovery stopped on an error`, async () => {
            const state = kind === 'page'
                ? page([Promise.resolve(response(['amount'], ['amount'], [], [scriptError]))])
                : dialog([Promise.resolve(response(['amount'], ['amount'], [], [scriptError]))], pageParent());
            await state.component.onPreviewModeChange(true);
            expect(state.component.previewRequiredFields).toEqual(['amount']);
            expect(state.warnings.length).toBe(1);
            expect(state.errors).toEqual([]);
            expect(state.dialogs.length).toBe(0);
            expect(state.component.loading).toBeFalse();
        });

        it(`shows no discovery warning in the ${kind} when field discovery finished cleanly`, async () => {
            const state = kind === 'page'
                ? page([Promise.resolve(response(['amount'], ['amount']))])
                : dialog([Promise.resolve(response(['amount'], ['amount']))], pageParent());
            await state.component.onPreviewModeChange(true);
            expect(state.warnings).toEqual([]);
            expect(state.errors).toEqual([]);
        });

        it(`updates missing fields in the ${kind} after API rejection and opens no result`, async () => {
            const failure = new HttpErrorResponse({ status: 422, error: { data: {
                preview: true, fields: ['amount', 'bonus'], missingFields: ['bonus']
            } } });
            const state = kind === 'page' ? page([Promise.reject(failure)]) : dialog([Promise.reject(failure)], pageParent());
            const { component, dialogs } = state;
            component.previewMode = true;
            component.previewRequiredFields = ['amount'];
            spyOn(console, 'error');
            await component.onStep();
            expect(component.previewRequiredFields).toEqual(['amount', 'bonus']);
            expect(dialogs.length).toBe(0);
            expect(component.loading).toBeFalse();
            expect(state.calls.length).toBe(1);
        });

        it(`ignores late missing-field rejection in the ${kind} after switching preview off`, async () => {
            let reject: (error: unknown) => void = () => undefined;
            const pendingResult = new Promise((_resolve, fail) => { reject = fail; });
            const { component, dialogs } = kind === 'page' ? page([pendingResult]) : dialog([pendingResult], pageParent());
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
    }

    for (const kind of ['page', 'dialog']) {
        it(`keeps discovery requirements, normal validity gating and later requirements in the ${kind}`, async () => {
            const results = [Promise.resolve(response(['amount', 'bonus'], ['bonus'])),
                Promise.resolve(response(['later']))];
            const state = kind === 'page' ? page(results) : dialog(results, pageParent());
            const { component, dialogs } = state;
            if (kind === 'dialog') {
                component.parent.isLocalUser = true;
            } else {
                component.isLocalUser = true;
            }
            component.ifRelayerAccountDisabled = () => false;
            await component.onPreviewModeChange(true);
            expect(component.previewRequiredFields).toEqual(['amount', 'bonus']);
            component.dataForm.valid = false;
            expect(component.ifDisabledBtn({ id: 'submit' })).toBeTrue();
            await component.onStep();
            expect(state.calls.length).toBe(1);
            expect(dialogs.length).toBe(0);
            component.dataForm.valid = true;
            expect(component.ifDisabledBtn({ id: 'submit' })).toBeFalse();
            await component.onStep();
            expect(state.calls.map((call) => call.previewFields)).toEqual([true, false]);
            expect(component.previewRequiredFields).toEqual(['amount', 'bonus', 'later']);
            expect(dialogs.length).toBe(1);
        });

        it(`keeps ordinary validation after switching preview off in the ${kind}`, async () => {
            const state = kind === 'page' ? page([]) : dialog([], pageParent());
            state.component.previewMode = false;
            state.component.dataForm.valid = false;
            expect(state.component.ifDisabledBtn({ id: 'submit' })).toBeTrue();
            await state.component.onStep();
            expect(state.calls.length).toBe(0);
            expect(state.dialogs.length).toBe(0);
        });
    }

    for (const kind of ['page', 'dialog']) {
        it(`persists both toggle values using the current user/policy/block in the ${kind}`, async () => {
            const { component } = kind === 'page' ? page([Promise.resolve(response(['amount']))])
                : dialog([Promise.resolve(response(['amount']))], pageParent());
            await component.onPreviewModeChange(true);
            await component.onPreviewModeChange(false);
            expect(component.calculationPreview.saveMode.calls.allArgs()).toEqual([
                ['user-1', 'policy-1', 'block-1', true], ['user-1', 'policy-1', 'block-1', false]
            ]);
            expect(component.previewRequiredFields).toBeNull();
        });

        it(`restores a saved flag only when the real form is ready and discovers fresh requirements once in the ${kind}`, async () => {
            const { component, calls, dialogs } = kind === 'page' ? page([Promise.resolve(response(['fresh']))])
                : dialog([Promise.resolve(response(['fresh']))], pageParent());
            if (kind === 'page') {
                component.schema = {};
            } else {
                component.parent.schema = {};
            }
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
                { id: kind === 'page' ? 'ref-1' : 'ref-2' }, true);
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

        it(`does not start saved preview for a disabled form in the ${kind}`, () => {
            const { component, calls } = kind === 'page' ? page([]) : dialog([], pageParent());
            if (kind === 'page') {
                component.schema = {};
                component.disabled = true;
            } else {
                component.parent.schema = {};
                component.parent.disabled = true;
            }
            component.calculationPreview.loadMode.and.returnValue(true);
            component.initForm(new FormGroup({ amount: new FormControl(5) }));
            expect(component.calculationPreview.loadMode).not.toHaveBeenCalled();
            expect(component.previewMode).toBeFalse();
            expect(calls.length).toBe(0);
            component.destroy$.next();
        });

        it(`keeps the normal mode and sends no discovery when no saved flag exists in the ${kind}`, () => {
            const { component, calls } = kind === 'page' ? page([]) : dialog([], pageParent());
            if (kind === 'page') {
                component.schema = {};
            } else {
                component.parent.schema = {};
            }
            component.initForm(new FormGroup({ amount: new FormControl(5) }));
            expect(component.previewMode).toBeFalse();
            expect(component.previewRequiredFields).toBeNull();
            expect(calls.length).toBe(0);
            expect(component.calculationPreview.saveMode).not.toHaveBeenCalled();
            component.destroy$.next();
        });
    }

    it('keeps the page submit-button callback gated by normal form validity in preview', () => {
        const { component } = page([]);
        component.previewMode = true;
        component.dataForm.valid = false;
        const button = { id: 'submit', disabled: () => false };
        component.onChangeButtons([button]);
        expect(button.disabled()).toBeTrue();
        component.dataForm.valid = true;
        expect(button.disabled()).toBeFalse();
    });

    it('does not restore a preview flag for a Request Addon dialog', () => {
        const { component, calls } = dialog([], { user: { id: 'user-1' }, id: 'addon-1', policyId: 'policy-1', schema: {} });
        component.calculationPreview.loadMode.and.returnValue(true);
        component.initForm(new FormGroup({ amount: new FormControl(5) }));
        expect(component.calculationPreview.loadMode).not.toHaveBeenCalled();
        expect(component.previewMode).toBeFalse();
        expect(calls.length).toBe(0);
        component.destroy$.next();
    });

    it('offers the toggle only for a Request document block', () => {
        expect(dialog([], pageParent()).component.previewAvailable).toBeTrue();
        expect(dialog([], { id: 'addon-1' }).component.previewAvailable).toBeFalse();
    });
    for (const kind of ['page','dialog']) {
        it(`keeps every missing address without opening results in the ${kind}`, async () => {
            const error = new HttpErrorResponse({ status: 422, error: { data: {
                preview: true, fields: ['amount'], missingFields: ['rows.1.bonus','rows.3.rate']
            } } });
            const { component, dialogs } = kind === 'page' ? page([Promise.reject(error)]) : dialog([Promise.reject(error)], pageParent());
            component.previewMode = true;
            component.previewRequiredFields = ['amount'];
            await component.runPreview(false);
            expect(component.previewMissingFields).toEqual(['rows.1.bonus','rows.3.rate']);
            expect(component.previewRequiredFields).toEqual(['amount','rows.bonus','rows.rate']);
            expect(component.dataForm.getRawValue()).toEqual({ amount: 5 });
            expect(dialogs.length).toBe(0);
            component.destroy$.next();
        });
    }

});
