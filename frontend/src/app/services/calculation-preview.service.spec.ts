import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CalculationPreviewService, ICalculationPreviewResult, normalizePreviewResult } from './calculation-preview.service';
import { PolicyEngineService } from './policy-engine.service';
import { TablePersistenceService } from './table-persistence.service';
import { ToastService } from './toast.service';

describe('CalculationPreviewService', () => {
    let service: CalculationPreviewService;
    let policyEngine: jasmine.SpyObj<PolicyEngineService>;
    let tables: jasmine.SpyObj<TablePersistenceService>;
    let toast: jasmine.SpyObj<ToastService>;

    const result = (fields: string[], missingFields: string[]): ICalculationPreviewResult =>
        normalizePreviewResult({ fields, missingFields });

    beforeEach(() => {
        policyEngine = jasmine.createSpyObj<PolicyEngineService>('PolicyEngineService', ['setBlockDataWithResult']);
        tables = jasmine.createSpyObj<TablePersistenceService>('TablePersistenceService', ['inlineTablesForPreview']);
        tables.inlineTablesForPreview.and.callFake(async (root: unknown) => {
            if (root && typeof root === 'object' && 'table' in root) {
                Reflect.set(root, 'table', 'inline');
            }
        });
        toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
        TestBed.configureTestingModule({
            providers: [
                CalculationPreviewService,
                { provide: PolicyEngineService, useValue: policyEngine },
                { provide: TablePersistenceService, useValue: tables },
                { provide: ToastService, useValue: toast },
            ],
        });
        service = TestBed.inject(CalculationPreviewService);
    });

    it('sends a cleaned copy of the form with the preview flags', async () => {
        policyEngine.setBlockDataWithResult.and.returnValue(of({ preview: true, fields: ['amount'], missingFields: [], errors: [] }));
        const form = { amount: 5, note: '', table: 'raw' };

        const response = await service.run('p-1', 'b-1', form, { id: 'ref-1' }, true);

        expect(policyEngine.setBlockDataWithResult).toHaveBeenCalledWith('b-1', 'p-1', {
            document: { amount: 5, table: 'inline' },
            ref: { id: 'ref-1' },
            preview: true,
            previewFields: true,
        });
        expect(form).toEqual({ amount: 5, note: '', table: 'raw' });
        expect(response.fields).toEqual(['amount']);
        expect(response.calculations).toEqual([]);
        expect(response.documents).toEqual([]);
    });

    const previewTable = (size: number): string =>
        JSON.stringify({ type: 'table', fileId: 'preview-key', csv: 'a'.repeat(size), columnNames: ['a'], columnKeys: ['a'] });

    it('stops a preview whose tables are larger than 10 MB and shows an error toast', async () => {
        tables.inlineTablesForPreview.and.callFake(async (root: unknown) => {
            Reflect.set(Object(root), 'table', previewTable(10 * 1024 * 1024 + 1));
        });

        await expectAsync(service.run('p-1', 'b-1', { table: 'raw' }, null, false))
            .toBeRejectedWithError('Tables are too large (10.0 MB). The limit is 10 MB.');
        expect(toast.error).toHaveBeenCalledOnceWith('Tables are too large (10.0 MB). The limit is 10 MB.', 'Calculation preview');
        expect(policyEngine.setBlockDataWithResult).not.toHaveBeenCalled();
    });

    it('adds up every table of the form, also inside groups and lists', async () => {
        tables.inlineTablesForPreview.and.callFake(async (root: unknown) => {
            Reflect.set(Object(root), 'table', previewTable(6 * 1024 * 1024));
            Reflect.set(Object(root), 'group', { rows: [previewTable(6 * 1024 * 1024)] });
        });

        await expectAsync(service.run('p-1', 'b-1', { table: 'raw' }, null, true))
            .toBeRejectedWithError('Tables are too large (12.0 MB). The limit is 10 MB.');
        expect(policyEngine.setBlockDataWithResult).not.toHaveBeenCalled();
    });

    it('sends a preview whose tables are exactly 10 MB', async () => {
        policyEngine.setBlockDataWithResult.and.returnValue(of({ preview: true, fields: [], missingFields: [], errors: [] }));
        tables.inlineTablesForPreview.and.callFake(async (root: unknown) => {
            Reflect.set(Object(root), 'table', previewTable(10 * 1024 * 1024));
            Reflect.set(Object(root), 'note', '{not json');
        });

        await service.run('p-1', 'b-1', { table: 'raw' }, null, false);

        expect(policyEngine.setBlockDataWithResult).toHaveBeenCalledTimes(1);
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('preserves the HTTP 422 rejection and reads only its calculation field requirements', async () => {
        const failure = new HttpErrorResponse({ status: 422, error: {
            statusCode: 422, message: 'Missing calculation inputs',
            data: { preview: true, fields: ['amount', 'bonus'], missingFields: ['bonus'] }
        } });
        policyEngine.setBlockDataWithResult.and.returnValue(throwError(() => failure));
        await expectAsync(service.run('p-1', 'b-1', { amount: 2 }, null, false)).toBeRejectedWith(failure);
        expect(service.getInputValidation(failure)).toEqual({ fields: ['amount', 'bonus'], missingFields: ['bonus'] });
        expect(policyEngine.setBlockDataWithResult).toHaveBeenCalledTimes(1);
    });

    it('ignores unrelated and malformed validation errors', () => {
        expect(service.getInputValidation(new Error('failed'))).toBeNull();
        for (const data of [{ fields: [], missingFields: [] },
            { preview: true, fields: [1], missingFields: [] },
            { preview: true, fields: [], missingFields: [null] }]) {
            expect(service.getInputValidation(new HttpErrorResponse({ status: 422, error: { data } }))).toBeNull();
        }
        expect(service.getInputValidation(new HttpErrorResponse({ status: 500,
            error: { data: { preview: true, fields: [], missingFields: [] } } }))).toBeNull();
    });

    afterEach(() => {
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith('CALCULATION_PREVIEW:')) {
                localStorage.removeItem(key);
            }
        }
    });

    it('restores the flag in a new service and scopes it to user, policy and block', () => {
        expect(service.loadMode('u1', 'p1', 'b1')).toBeFalse();
        service.saveMode('u1', 'p1', 'b1', true);
        const restored = new CalculationPreviewService(policyEngine, tables, toast);
        expect(restored.loadMode('u1', 'p1', 'b1')).toBeTrue();
        expect(restored.loadMode('u2', 'p1', 'b1')).toBeFalse();
        expect(restored.loadMode('u1', 'p2', 'b1')).toBeFalse();
        expect(restored.loadMode('u1', 'p1', 'b2')).toBeFalse();
        restored.saveMode('u1', 'p1', 'b1', false);
        expect(service.loadMode('u1', 'p1', 'b1')).toBeFalse();
        const keys = Object.keys(localStorage).filter((key) => key.startsWith('CALCULATION_PREVIEW:'));
        expect(keys.length).toBe(1);
        expect(localStorage.getItem(keys[0])).toBe('false');
        expect(policyEngine.setBlockDataWithResult).not.toHaveBeenCalled();
    });

    it('does not persist or restore an unscoped flag before the user/form identity is known', () => {
        service.saveMode(undefined, 'p1', 'b1', true);
        service.saveMode('u1', '', 'b1', true);
        service.saveMode('u1', 'p1', '', true);
        expect(service.loadMode(undefined, 'p1', 'b1')).toBeFalse();
        expect(Object.keys(localStorage).filter((key) => key.startsWith('CALCULATION_PREVIEW:'))).toEqual([]);
    });

    it('keeps default-off behaviour if browser storage is unavailable', () => {
        spyOn(console, 'error');
        spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
        spyOn(Storage.prototype, 'setItem').and.throwError('blocked');
        expect(service.loadMode('u1', 'p1', 'b1')).toBeFalse();
        expect(() => service.saveMode('u1', 'p1', 'b1', true)).not.toThrow();
        expect(policyEngine.setBlockDataWithResult).not.toHaveBeenCalled();
    });

    it('normalizes a partial response', () => {
        expect(normalizePreviewResult(null)).toEqual({
            trackingId: '',
            input: null,
            documents: [],
            calculations: [],
            fields: [],
            missingFields: [],
            errors: [],
            incomplete: [],
        });
    });

    it('applies discovery requirements and merges later response fields without clearing them', () => {
        expect(service.updateRequiredFields(null, result(['rate', 'amount'], ['rate'])))
            .toEqual(['amount', 'rate']);
        expect(service.updateRequiredFields(['amount'], result(['location.lat'], ['bonus'])))
            .toEqual(['amount', 'bonus', 'location.lat']);
        expect(service.updateRequiredFields(['amount'], result([], []))).toEqual(['amount']);
    });

    it('returns the same list when nothing new is needed', () => {
        const current = ['amount', 'rate'];
        expect(service.updateRequiredFields(current, result(['rate'], ['amount']))).toBe(current);
    });

    it('returns an empty list when the form has no calculation', () => {
        expect(service.updateRequiredFields(null, result([], []))).toEqual([]);
    });

    it('lists every returned document for the viewer, named by the block it was going to', () => {
        const preview = normalizePreviewResult({
            documents: [
                { source: 't09_math', target: 't09_save_a', document: { document: { id: 'vc-a' } } },
                { source: 't09_math', target: 't09_save_b', document: [{ document: { id: 'vc-b1' } }, { document: { id: 'vc-b2' } }] },
                { source: 't09_end', target: null, document: { document: { id: 'vc-end' } } },
            ],
        });
        expect(service.getViewerDocuments(preview)).toEqual([
            { label: '1. t09_save_a', document: { id: 'vc-a' } },
            { label: '2. t09_save_b', document: { id: 'vc-b1' } },
            { label: '3. t09_save_b', document: { id: 'vc-b2' } },
            { label: '4. t09_end', document: { id: 'vc-end' } },
        ]);
    });

    it('drops the placeholder file id of a preview table so the viewer reads its csv', () => {
        const inline = JSON.stringify({ type: 'table', fileId: 'preview-key-1', csv: 'year,area\r\n2024,10\r\n2025,20\r\n' });
        const keyed = JSON.stringify({
            type: 'table', fileId: 'preview-key-2', csv: 'Year,Area\r\n2026,30\r\n', columnNames: ['Year', 'Area'], columnKeys: ['year', 'area']
        });
        const stored = JSON.stringify({ type: 'table', fileId: '0123456789abcdef01234567', columnKeys: ['year'], rows: [] });
        const subject = { total: 3, areaTable: inline, savedTable: stored, note: '{not json', group: { rows: [keyed] } };
        const preview = normalizePreviewResult({
            documents: [{ source: 't04_math', target: 't04_save', document: { document: { credentialSubject: [subject] } } }],
        });

        const [viewer] = service.getViewerDocuments(preview);
        const shown: any = viewer.document;
        expect(JSON.parse(shown.credentialSubject[0].areaTable)).toEqual({ type: 'table', csv: 'year,area\r\n2024,10\r\n2025,20\r\n' });
        expect(JSON.parse(shown.credentialSubject[0].group.rows[0])).toEqual({
            type: 'table', csv: 'Year,Area\r\n2026,30\r\n', columnNames: ['Year', 'Area'], columnKeys: ['year', 'area']
        });
        expect(shown.credentialSubject[0].savedTable).toBe(stored);
        expect(shown.credentialSubject[0].note).toBe('{not json');
        expect(shown.credentialSubject[0].total).toBe(3);
        expect(subject.areaTable).toBe(inline);
    });

    it('skips returned items that carry no document', () => {
        const preview = normalizePreviewResult({
            documents: [
                { source: 'a', target: 'b', document: null },
                { source: 'a', target: 'c', document: { document: null } },
            ],
        });
        expect(service.getViewerDocuments(preview)).toEqual([]);
    });

    it('shows an incomplete result as an error toast with its block, once', () => {
        service.showErrors(normalizePreviewResult({
            errors: [{ message: 'Calculation preview result is incomplete: the operator $elemMatch', blockType: 'customLogicBlock', errorData: null }],
            incomplete: [
                { blockType: 'customLogicBlock', reason: 'the operator $elemMatch' },
                { blockType: null, reason: 'an aggregation over VcDocument changed in this preview' },
            ],
        }));
        expect(toast.error.calls.allArgs()).toEqual([
            ['Calculation preview result is incomplete: the operator $elemMatch', 'customLogicBlock', { blockErrorData: undefined }],
            ['Calculation preview result is incomplete: an aggregation over VcDocument changed in this preview', 'Calculation preview'],
        ]);
    });

    it('shows no document of an incomplete result in the viewer', () => {
        const preview = normalizePreviewResult({
            documents: [{ source: 'sum', target: 'save', blockType: 'sendToGuardianBlock', document: { document: { id: 'vc-1' } } }],
            incomplete: [{ blockType: 'customLogicBlock', reason: 'the operator $elemMatch' }],
        });
        expect(service.getViewerDocuments(preview)).toEqual([]);
    });

    it('shows every block error as the normal block error toast', () => {
        const errorData: any = { code: 'E1' };
        service.showErrors(normalizePreviewResult({
            errors: [
                { message: 'rate is required', blockType: 'customLogicBlock', errorData },
                { message: 'Invalid expression: doubled', blockType: 'requestVcDocumentBlock', errorData: null },
                { message: 'no block', blockType: null, errorData: null },
            ],
        }));
        expect(toast.error.calls.allArgs()).toEqual([
            ['rate is required', 'customLogicBlock', { blockErrorData: errorData }],
            ['Invalid expression: doubled', 'requestVcDocumentBlock', { blockErrorData: undefined }],
            ['no block', '', { blockErrorData: undefined }],
        ]);
    });
    it('keeps indexed paths in errors and applies schema paths to required flags', () => {
        const error = new HttpErrorResponse({ status: 422, error: { data: {
            preview: true, fields: ['amount'], missingFields: ['rows.1.bonus','rows.3.rate']
        } } });
        const validation = service.getInputValidation(error)!;
        expect(validation.missingFields).toEqual(['rows.1.bonus','rows.3.rate']);
        expect(service.updateRequiredFields(['amount'], validation)).toEqual(['amount','rows.bonus','rows.rate']);
    });

});
