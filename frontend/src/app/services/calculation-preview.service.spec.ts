import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

    it('normalizes a partial response', () => {
        expect(normalizePreviewResult(null)).toEqual({
            trackingId: '',
            input: null,
            documents: [],
            calculations: [],
            fields: [],
            missingFields: [],
            errors: [],
        });
    });

    it('adds new needed and missing fields to the list, sorted and without repeats', () => {
        expect(service.updateRequiredFields(null, result(['rate', 'amount'], ['note'])))
            .toEqual(['amount', 'note', 'rate']);
        expect(service.updateRequiredFields(['amount'], result(['amount'], ['location.lat'])))
            .toEqual(['amount', 'location.lat']);
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
});
