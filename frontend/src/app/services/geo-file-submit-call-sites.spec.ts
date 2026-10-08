import { EMPTY, of, Subject, throwError } from 'rxjs';
import { RequestDocumentBlockComponent } from '../modules/policy-engine/policy-viewer/blocks/request-document-block/request-document-block.component';
import { RequestDocumentBlockDialog } from '../modules/policy-engine/policy-viewer/blocks/request-document-block/dialog/request-document-block-dialog.component';
import { VCFullscreenDialog } from '../modules/schema-engine/vc-fullscreen-dialog/vc-fullscreen-dialog.component';

describe('geo file submit call sites', () => {
    it('persists tables then geo files before the main request', async () => {
        const order: string[] = [];
        const component = Object.create(RequestDocumentBlockComponent.prototype) as any;
        component.dataForm = { getRawValue: () => ({ place: {} }) };
        component.storage = { delete: () => undefined };
        component.getAutosaveId = () => 'autosave';
        component.tablePersist = {
            persistTablesInDocument: async () => order.push('tables'),
            rollbackIpfsUploads: async () => undefined
        };
        component.geoFilePersist = {
            persistGeoFilesInDocument: async () => order.push('geo'),
            rollbackGridFsUploads: async () => undefined
        };
        component.policyEngineService = {
            setBlockDataWithResult: () => {
                order.push('request');
                return of({});
            }
        };
        component.policyTest = { state: { captureNextFormSubmit: false } };
        component.enableAdditionalData = false;
        component.relayerAccount = false;
        component.dryRun = false;
        component.policyId = 'policy-1';
        component.id = 'block-1';
        component.dialogRef = null;

        await component.onSubmit(false);

        expect(order).toEqual(['tables', 'geo', 'request']);
    });

    it('rolls back the geo GridFS upload when the main request fails', async () => {
        const rollback = jasmine.createSpy('rollback').and.resolveTo();
        const component = Object.create(RequestDocumentBlockComponent.prototype) as any;
        component.dataForm = { getRawValue: () => ({}) };
        component.storage = { delete: () => undefined };
        component.getAutosaveId = () => 'autosave';
        component.tablePersist = {
            persistTablesInDocument: async () => undefined,
            rollbackIpfsUploads: async () => undefined
        };
        component.geoFilePersist = {
            persistGeoFilesInDocument: async () => undefined,
            rollbackGridFsUploads: rollback
        };
        component.policyEngineService = {
            setBlockDataWithResult: () => throwError(() => ({ error: 'failed' }))
        };
        component.policyTest = { state: { captureNextFormSubmit: false } };
        component.enableAdditionalData = false;
        component.relayerAccount = false;
        component.dryRun = false;
        component.policyId = 'policy-1';
        component.id = 'block-1';

        await component.onSubmit(false);
        await Promise.resolve();

        expect(rollback).toHaveBeenCalled();
    });

    it('persists geo files before the dialog request', async () => {
        const order: string[] = [];
        const component = Object.create(RequestDocumentBlockDialog.prototype) as any;
        component.parent = {
            id: 'block-1', policyId: 'policy-1', dryRun: false,
            relayerAccount: false, getRef: () => null, getAutosaveId: () => 'autosave'
        };
        component.dataForm = { getRawValue: () => ({ place: {} }) };
        component.storage = { delete: () => undefined };
        component.tablePersist = { persistTablesInDocument: async () => order.push('tables') };
        component.geoFilePersist = { persistGeoFilesInDocument: async () => order.push('geo') };
        component.policyEngineService = {
            setBlockDataWithResult: () => {
                order.push('request');
                return of({});
            }
        };
        component.policyTest = { state: { captureNextFormSubmit: false } };
        component.enableAdditionalData = false;
        component.dialogRef = { close: () => undefined };

        await component.onSubmit(false);

        expect(order).toEqual(['tables', 'geo', 'request']);
    });

    it('persists geo files before a new-version request and rolls back an error', async () => {
        const order: string[] = [];
        const rollback = jasmine.createSpy('rollback').and.resolveTo();
        const closed = new Subject<boolean>();
        const component = Object.create(VCFullscreenDialog.prototype) as any;
        component.dialog = { open: () => ({ onClose: closed }) };
        component.dataForm = { getRawValue: () => ({ place: {} }) };
        component.tablePersist = { persistTablesInDocument: async () => order.push('tables') };
        component.geoFilePersist = {
            persistGeoFilesInDocument: async () => order.push('geo'),
            rollbackGridFsUploads: rollback
        };
        component.policyEngineService = {
            createNewVersionVcDocument: () => {
                order.push('request');
                return EMPTY;
            }
        };
        component.policyId = 'policy-1';
        component.documentId = 'doc-1';
        component.allVcDocs = [{}];

        component.onUpdatableBtnEvent();
        closed.next(true);
        await Promise.resolve();
        await Promise.resolve();

        expect(order).toEqual(['tables', 'geo', 'request']);
        expect(rollback).toHaveBeenCalled();
    });
});
