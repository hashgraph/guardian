import { BlockErrorType } from '@guardian/interfaces';
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

    it('sends selected evidence and relayer in discovery and real Preview', async () => {
        policyEngine.setBlockDataWithResult.and.returnValue(of({ preview: true }));
        const metadata = { relayerAccount: '0.0.999', evidence: [{ dataType: 'message', data: 'proof' }] };
        for (const discovery of [true, false]) {
            await service.run('p', 'b', { amount: 3 }, null, discovery, metadata);
            expect(policyEngine.setBlockDataWithResult).toHaveBeenCalledWith('b', 'p', {
                document: { amount: 3 }, ref: null, ...metadata, preview: true, previewFields: discovery
            });
        }
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
            sameSchema: false,
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

    it('takes the requirements of the latest response and drops fields only an earlier branch needed', () => {
        expect(service.updateRequiredFields(null, result(['rate', 'amount'], ['rate'])))
            .toEqual(['amount', 'rate']);
        expect(service.updateRequiredFields(['amount', 'rate'], result(['amount', 'fuel'], ['fuel'])))
            .toEqual(['amount', 'fuel']);
        expect(service.updateRequiredFields(['amount'], result([], []))).toEqual([]);
    });

    it('returns a fresh list so a response replaces requirements shifted by row deletion', () => {
        const current = ['amount', 'rate'];
        const next = service.updateRequiredFields(current, result(['rate'], ['amount']));
        expect(next).toEqual(current);
        expect(next).not.toBe(current);
    });

    it('returns an empty list when the form has no calculation', () => {
        expect(service.updateRequiredFields(null, result([], []))).toEqual([]);
    });

    it('lists the input first and then every returned document, named by the block it was going to', () => {
        const preview = normalizePreviewResult({
            input: { document: { id: 'vc-input' } },
            documents: [
                { source: 't09_math', target: 't09_save_a', blockType: 'sendToGuardianBlock', document: { document: { id: 'vc-a' } } },
                { source: 't09_math', target: 't09_save_b', blockType: 'sendToGuardianBlock', document: [{ document: { id: 'vc-b1' } }, { document: { id: 'vc-b2' } }] },
                { source: 't09_end', target: null, document: { document: { id: 'vc-end' } } },
            ],
        });
        expect(service.getTimeline(preview)).toEqual([
            { role: 'input', label: 'Form values', blockType: null, source: null, target: null, document: { id: 'vc-input' } },
            { role: 'result', label: 't09_save_a', blockType: 'sendToGuardianBlock', source: 't09_math', target: 't09_save_a', document: { id: 'vc-a' } },
            { role: 'result', label: 't09_save_b', blockType: 'sendToGuardianBlock', source: 't09_math', target: 't09_save_b', document: { id: 'vc-b1' } },
            { role: 'result', label: 't09_save_b', blockType: 'sendToGuardianBlock', source: 't09_math', target: 't09_save_b', document: { id: 'vc-b2' } },
            { role: 'result', label: 't09_end', blockType: null, source: 't09_end', target: null, document: { id: 'vc-end' } },
        ]);
    });

    it('unwraps the document of a state and keeps the input as a fallback', () => {
        const unwrap = (value: unknown) => Reflect.get(service, 'unwrapDocument').call(service, value);
        expect(unwrap({ document: { id: 'a' } })).toEqual({ id: 'a' });
        expect(unwrap({ document: 'text' })).toBeNull();
        expect(unwrap(null)).toBeNull();
        const input = (value: unknown) => Reflect.get(service, 'getInputDocument').call(service, value);
        expect(input({ document: { id: 'a' } })).toEqual({ id: 'a' });
        expect(input({ id: 'b' })).toEqual({ id: 'b' });
        expect(input('text')).toBeNull();
    });

    it('takes an input that is the document itself', () => {
        const preview = normalizePreviewResult({ input: { id: 'vc-input', credentialSubject: [] } });
        expect(service.getTimeline(preview)).toEqual([
            { role: 'input', label: 'Form values', blockType: null, source: null, target: null, document: { id: 'vc-input', credentialSubject: [] } },
        ]);
    });

    it('has no input item when the result carries no input', () => {
        const preview = normalizePreviewResult({
            documents: [{ source: 'a', target: 'b', blockType: 'mathBlock', document: { document: { id: 'vc-a' } } }],
        });
        expect(service.getTimeline(preview).map((item) => item.role)).toEqual(['result']);
    });

    it('reads the schema type of a returned document', () => {
        expect(service.getSchemaType({ credentialSubject: [{ type: 'schema-a&1.0.0' }] })).toBe('schema-a&1.0.0');
        expect(service.getSchemaType({ credentialSubject: { type: 'schema-b' } })).toBe('schema-b');
        expect(service.getSchemaType({ credentialSubject: [] })).toBeNull();
        expect(service.getSchemaType({ id: 'vc' })).toBeNull();
        expect(service.getSchemaType(null)).toBeNull();
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

        const [item] = service.getTimeline(preview);
        const shown: any = item.document;
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
        expect(service.getTimeline(preview)).toEqual([]);
    });

    it('keeps the input and saved documents for an incomplete result', () => {
        const preview = normalizePreviewResult({
            input: { document: { id: 'vc-input' } },
            documents: [{ source: 'sum', target: 'save', blockType: 'sendToGuardianBlock', document: { document: { id: 'vc-1' } } }],
            incomplete: [{ blockType: 'customLogicBlock', reason: 'the operator $elemMatch' }],
        });
        expect(service.getTimeline(preview).map((item) => item.document)).toEqual([{ id: 'vc-input' }, { id: 'vc-1' }]);
    });

    it('reports an incomplete result as a problem with its block, once', () => {
        const problems = service.getProblems(normalizePreviewResult({
            errors: [{ message: 'Calculation preview result is incomplete: the operator $elemMatch', blockType: 'customLogicBlock', errorData: null }],
            incomplete: [
                { blockType: 'customLogicBlock', reason: 'the operator $elemMatch' },
                { blockType: null, reason: 'an aggregation over VcDocument changed in this preview' },
            ],
        }));
        expect(problems).toEqual([
            { blockType: 'customLogicBlock', message: 'Calculation preview result is incomplete: the operator $elemMatch', errorData: null },
            { blockType: null, message: 'Calculation preview result is incomplete: an aggregation over VcDocument changed in this preview', errorData: null },
        ]);
    });

    it('reports every block error as a problem and never as a toast', () => {
        const problems = service.getProblems(normalizePreviewResult({
            errors: [
                { message: 'rate is required', blockType: 'customLogicBlock', errorData: { type: BlockErrorType.DOCUMENT_VALIDATOR_BLOCK_ERROR } },
                { message: 'no block', blockType: null, errorData: null },
            ],
        }));
        expect(problems).toEqual([
            { blockType: 'customLogicBlock', message: 'rate is required', errorData: { type: BlockErrorType.DOCUMENT_VALIDATOR_BLOCK_ERROR } },
            { blockType: null, message: 'no block', errorData: null },
        ]);
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('has no problems for a clean result', () => {
        expect(service.getProblems(normalizePreviewResult({ fields: ['amount'] }))).toEqual([]);
    });

    it('needs the discovery warning when field discovery stopped on an error', () => {
        expect(service.needsDiscoveryWarning(normalizePreviewResult({
            errors: [{ message: 'Calculation returned a non-finite number', blockType: 'mathBlock', errorData: null }],
        }))).toBeTrue();
    });

    it('needs the discovery warning when field discovery returned an incomplete result', () => {
        expect(service.needsDiscoveryWarning(normalizePreviewResult({
            incomplete: [{ blockType: 'customLogicBlock', reason: 'the operator $elemMatch' }],
        }))).toBeTrue();
    });

    it('does not need the discovery warning when field discovery finished cleanly', () => {
        expect(service.needsDiscoveryWarning(normalizePreviewResult({ fields: ['amount'], missingFields: ['amount'] }))).toBeFalse();
    });

    it('keeps indexed paths in errors and applies schema paths to required flags', () => {
        const error = new HttpErrorResponse({ status: 422, error: { data: {
            preview: true, fields: ['amount'], missingFields: ['rows.1.bonus','rows.3.rate']
        } } });
        const validation = service.getInputValidation(error)!;
        expect(validation.missingFields).toEqual(['rows.1.bonus','rows.3.rate']);
        expect(service.updateRequiredFields(['amount'], validation)).toEqual(['amount','rows.1.bonus','rows.3.rate']);
    });

    it('keeps input, intermediates and every branch regardless of schema match', () => {
        const preview = normalizePreviewResult({ sameSchema: true, input: { document: { id: 'input' } }, documents: [
            { source: 'input', final: false, document: { document: { id: 'saved-input' } } },
            { source: 'matching', final: true, sameSchema: true, document: { document: { id: 'matching' } } },
            { source: 'other', final: true, sameSchema: false, document: { document: { id: 'other' } } },
        ] });
        const items = service.getTimeline(preview);
        expect(items.map((item) => item.document)).toEqual([{ id: 'input' }, { id: 'saved-input' }, { id: 'matching' }, { id: 'other' }]);
        expect(items[2].final).toBeTrue();
        expect(items[2].sameSchema).toBeTrue();
        expect(items[3].sameSchema).toBeFalse();
        expect(preview.documents.length).toBe(3);
    });

    it('keeps every matching final document from several branches', () => {
        const preview = normalizePreviewResult({ sameSchema: true, documents: ['a', 'b'].map((id) => ({
            source: id, final: true, sameSchema: true, document: { document: { id } }
        })) });
        expect(service.getTimeline(preview).map((item) => item.document)).toEqual([{ id: 'a' }, { id: 'b' }]);
    });

    it('preserves final flags while unwrapping batches for separate-schema results', () => {
        const preview = normalizePreviewResult({ input: { document: { id: 'input' } }, documents: [{
            source: 'batch', final: true, sameSchema: false, document: [{ document: { id: 'a' } }, { document: { id: 'b' } }]
        }] });
        const items = service.getTimeline(preview);
        expect(items.length).toBe(3);
        expect(items.slice(1).map((item) => item.final)).toEqual([true, true]);
        expect(items.slice(1).map((item) => item.sameSchema)).toEqual([false, false]);
    });

    it('keeps an unsaved branch-end result without promoting it to final', () => {
        const unsaved = { credentialSubject: [{ type: 'Output', total: 6 }] };
        const preview = normalizePreviewResult({ input: { document: { id: 'input' } }, documents: [
            { source: 'save', final: false, document: { id: 'stored-record', document: { id: 'saved' } } },
            { source: 'math', final: false, document: { document: unsaved } },
        ] });
        const items = service.getTimeline(preview);
        expect(items.map((item) => item.document)).toEqual([{ id: 'input' }, { id: 'saved' }, unsaved]);
        expect(items[2].source).toBe('math');
        expect(items[2].final).toBeFalse();
    });

});
