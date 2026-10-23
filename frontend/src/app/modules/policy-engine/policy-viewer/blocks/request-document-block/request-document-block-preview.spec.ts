import { RequestDocumentBlockComponent } from './request-document-block.component';
import { RequestDocumentBlockDialog } from './dialog/request-document-block-dialog.component';
import { normalizePreviewResult } from 'src/app/services/calculation-preview.service';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';

describe('request document preview wiring', () => {
    const saved = [{ source: 'form', target: 'save', document: { document: { id: 'vc-1' } } }];
    const scriptError = { message: 'rate is required', blockType: 'customLogicBlock', errorData: null };
    const response = (fields: string[], missingFields: string[] = [], documents: unknown[] = saved, errors: unknown[] = []) =>
        normalizePreviewResult({ fields, missingFields, documents, errors });

    const preview = (results: Promise<unknown>[]) => {
        const calls: { previewFields: boolean; ref: unknown }[] = [];
        const errors: unknown[] = [];
        return {
            calls,
            errors,
            service: {
                run: (_policyId: string, _blockId: string, _value: unknown, ref: unknown, previewFields: boolean) => {
                    calls.push({ previewFields, ref });
                    return results.shift();
                },
                updateRequiredFields: (current: string[] | null, result: any) =>
                    [...new Set([...(current || []), ...result.fields, ...result.missingFields])].sort(),
                getViewerDocuments: (result: any) => result.documents.map((item: any, index: number) => ({
                    label: `${index + 1}. ${item.target}`,
                    document: item.document.document,
                })),
                showErrors: (result: any) => errors.push(...result.errors),
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
        component.policyId = 'policy-1';
        component.id = 'block-1';
        component.ref = { id: 'ref-1' };
        component.disabled = false;
        component.loading = false;
        component.previewMode = false;
        component.previewRequiredFields = null;
        return { component, calls: fake.calls, errors: fake.errors, uploads, dialogs };
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
        component.dataForm = { valid: true, getRawValue: () => ({ amount: 5 }) };
        component.dialogService = { open: (type: unknown, config: any) => dialogs.push({ type, config }) };
        component.stepper = [true, false, false];
        component.enableAdditionalData = false;
        component.buttonNames = { submit: 'Validate & Create' };
        component.loading = false;
        component.previewMode = false;
        component.previewRequiredFields = null;
        return { component, calls: fake.calls, dialogs };
    };

    const pageParent = () => {
        const parent = Object.create(RequestDocumentBlockComponent.prototype) as any;
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

    it('offers the toggle only for a Request document block', () => {
        expect(dialog([], pageParent()).component.previewAvailable).toBeTrue();
        expect(dialog([], { id: 'addon-1' }).component.previewAvailable).toBeFalse();
    });
});
