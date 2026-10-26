import { of } from 'rxjs';
import { VCViewerDialog } from './vc-dialog.component';

describe('VCViewerDialog preview documents', () => {
    const open = (data: Record<string, unknown>) => {
        const dialog = Object.create(VCViewerDialog.prototype) as any;
        dialog.viewDocumentOptions = [];
        dialog.allVcDocs = [];
        dialog.previewDocuments = [];
        dialog.previewOptions = [];
        dialog.selectedPreviewIndex = 0;
        dialog.dialogConfig = { data };
        dialog.profileService = { getProfile: () => of({}) };
        dialog.schemaService = {};
        dialog.policyEngineService = {};
        dialog.ref = { markForCheck: () => undefined, detectChanges: () => undefined };
        dialog.ngOnInit();
        return dialog;
    };

    const documents = [
        { label: '1. t09_save_a', document: { id: 'vc-a' } },
        { label: '2. t09_save_b', document: { id: 'vc-b' } },
    ];

    it('offers one option per returned document and shows the first one', () => {
        const dialog = open({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents });
        expect(dialog.previewOptions).toEqual([
            { label: '1. t09_save_a', value: 0 },
            { label: '2. t09_save_b', value: 1 },
        ]);
        expect(dialog.document).toEqual({ id: 'vc-a' });
        expect(dialog.viewDocument).toBeTrue();
    });

    it('switches the shown document when another option is chosen', () => {
        jasmine.clock().install();
        try {
            const dialog = open({ type: 'VC', viewDocument: true, document: documents[0].document, previewDocuments: documents });
            dialog.onPreviewDocumentChange({ value: 1 });
            expect(dialog.selectedPreviewIndex).toBe(1);
            expect(dialog.document).toEqual({ id: 'vc-b' });
            expect(JSON.parse(dialog.json)).toEqual({ id: 'vc-b' });
            jasmine.clock().tick(500);
            expect(dialog.loading).toBeFalse();
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('has no document options when it is opened the usual way', () => {
        const dialog = open({ type: 'VC', viewDocument: true, document: { id: 'vc-1' } });
        expect(dialog.previewDocuments).toEqual([]);
        expect(dialog.previewOptions).toEqual([]);
    });
});
