import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CalculationPreviewService, ICalculationPreviewResult, normalizePreviewResult } from './calculation-preview.service';
import { PolicyEngineService } from './policy-engine.service';
import { TablePersistenceService } from './table-persistence.service';

describe('CalculationPreviewService', () => {
    let service: CalculationPreviewService;
    let policyEngine: jasmine.SpyObj<PolicyEngineService>;
    let tables: jasmine.SpyObj<TablePersistenceService>;

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
        TestBed.configureTestingModule({
            providers: [
                CalculationPreviewService,
                { provide: PolicyEngineService, useValue: policyEngine },
                { provide: TablePersistenceService, useValue: tables },
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

    it('labels fields by description with nested paths', () => {
        const fields: any[] = [
            { name: 'amount', description: 'Amount', isRef: false },
            { name: 'note', description: '', isRef: false },
            {
                name: 'location',
                description: 'Location',
                isRef: true,
                fields: [{ name: 'lat', description: 'Latitude', isRef: false }],
            },
        ];
        expect(service.getFieldLabels(fields)).toEqual({
            amount: 'Amount',
            note: 'note',
            location: 'Location',
            'location.lat': 'Latitude',
        });
    });
});
