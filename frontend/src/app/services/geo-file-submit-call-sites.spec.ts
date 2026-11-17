import { EMPTY, of, Subject, throwError } from 'rxjs';
import { RequestDocumentFormComponent } from '../modules/policy-engine/policy-viewer/blocks/request-document-block/form/request-document-form.component';
import { VCFullscreenDialog } from '../modules/schema-engine/vc-fullscreen-dialog/vc-fullscreen-dialog.component';

describe('geo file submit call sites', () => {
    it('persists geo files before the dialog request', async () => {
        const order: string[] = [];
        const component = Object.create(RequestDocumentFormComponent.prototype) as any;
        component.showSubmitted = () => undefined; // its 1s timer would otherwise fire after the spec ends
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
        const rollback = vi.fn().mockResolvedValue(undefined);
        const tableRollback = vi.fn().mockResolvedValue(undefined);
        const closed = new Subject<boolean>();
        const component = Object.create(VCFullscreenDialog.prototype) as any;
        component.dialog = { open: () => ({ onClose: closed }) };
        component.dataForm = { valid: true, getRawValue: () => ({ place: {} }) };
        component.tablePersist = {
            persistTablesInDocument: async () => order.push('tables'),
            rollbackIpfsUploads: tableRollback
        };
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
        for (let index = 0; index < 5; index++)
            await Promise.resolve();

        expect(order).toEqual(['tables', 'geo', 'request']);
        expect(tableRollback).toHaveBeenCalled();
        expect(rollback).toHaveBeenCalled();
    });

    it('rolls back tables and geo files when the dialog request fails', async () => {
        const tableRollback = vi.fn().mockResolvedValue(undefined);
        const geoRollback = vi.fn().mockResolvedValue(undefined);
        const component = Object.create(RequestDocumentFormComponent.prototype) as any;
        component.showSubmitted = () => undefined; // its 1s timer would otherwise fire after the spec ends
        component.parent = {
            id: 'block-1', policyId: 'policy-1', dryRun: false,
            relayerAccount: false, getRef: () => null, getAutosaveId: () => 'autosave'
        };
        component.dataForm = { getRawValue: () => ({ place: {} }) };
        component.storage = { delete: () => undefined };
        component.tablePersist = {
            persistTablesInDocument: async () => undefined,
            rollbackIpfsUploads: tableRollback
        };
        component.geoFilePersist = {
            persistGeoFilesInDocument: async () => undefined,
            rollbackGridFsUploads: geoRollback
        };
        component.policyEngineService = {
            setBlockDataWithResult: () => throwError(() => ({ error: 'failed' }))
        };
        component.policyTest = { state: { captureNextFormSubmit: false } };
        component.enableAdditionalData = false;
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await component.onSubmit(false);
        for (let index = 0; index < 5; index++)
            await Promise.resolve();

        expect(tableRollback).toHaveBeenCalled();
        expect(geoRollback).toHaveBeenCalled();
        expect(component.loading).toBe(false);
    });

    describe('when a file upload fails before the request', () => {
        let tablePersist: any;
        let geoFilePersist: any;

        beforeEach(() => {
            tablePersist = {
                persistTablesInDocument: async () => undefined,
                rollbackIpfsUploads: vi.fn().mockResolvedValue(undefined)
            };
            geoFilePersist = {
                persistGeoFilesInDocument: async () => {
                    throw new Error('ipfs failed');
                },
                rollbackGridFsUploads: vi.fn().mockResolvedValue(undefined)
            };
            vi.spyOn(console, 'error').mockImplementation(() => undefined);
        });

        it('rolls back the dialog uploads and sends nothing', async () => {
            const request = vi.fn();
            const deleteAutosave = vi.fn();
            const component = Object.create(RequestDocumentFormComponent.prototype) as any;
            component.showSubmitted = () => undefined; // its 1s timer would otherwise fire after the spec ends
            component.parent = {
                id: 'block-1', policyId: 'policy-1', dryRun: false,
                relayerAccount: false, getRef: () => null, getAutosaveId: () => 'autosave'
            };
            component.dataForm = { getRawValue: () => ({ place: {} }) };
            component.storage = { delete: deleteAutosave };
            component.tablePersist = tablePersist;
            component.geoFilePersist = geoFilePersist;
            component.policyEngineService = { setBlockDataWithResult: request };

            await component.onSubmit(false);

            expect(tablePersist.rollbackIpfsUploads).toHaveBeenCalled();
            expect(geoFilePersist.rollbackGridFsUploads).toHaveBeenCalled();
            expect(request).not.toHaveBeenCalled();
            expect(deleteAutosave).not.toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });

        it('rolls back the new-version uploads and sends nothing', async () => {
            const request = vi.fn();
            const closed = new Subject<boolean>();
            const component = Object.create(VCFullscreenDialog.prototype) as any;
            component.dialog = { open: () => ({ onClose: closed }) };
            component.dataForm = { valid: true, getRawValue: () => ({ place: {} }) };
            component.tablePersist = tablePersist;
            component.geoFilePersist = geoFilePersist;
            component.policyEngineService = { createNewVersionVcDocument: request };
            component.policyId = 'policy-1';
            component.documentId = 'doc-1';
            component.allVcDocs = [{}];

            component.onUpdatableBtnEvent();
            closed.next(true);
            for (let index = 0; index < 5; index++)
                await Promise.resolve();

            expect(tablePersist.rollbackIpfsUploads).toHaveBeenCalled();
            expect(geoFilePersist.rollbackGridFsUploads).toHaveBeenCalled();
            expect(request).not.toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });
    });

    describe('when table persistence fails before geo persistence starts', () => {
        let tablePersist: any;
        let geoFilePersist: any;

        beforeEach(() => {
            tablePersist = {
                persistTablesInDocument: async () => {
                    throw new Error('table failed');
                },
                rollbackIpfsUploads: vi.fn().mockResolvedValue(undefined)
            };
            geoFilePersist = {
                persistGeoFilesInDocument: vi.fn().mockResolvedValue(undefined),
                rollbackGridFsUploads: vi.fn().mockResolvedValue(undefined)
            };
            vi.spyOn(console, 'error').mockImplementation(() => undefined);
        });

        it('does not roll back geo files in the dialog', async () => {
            const component = Object.create(RequestDocumentFormComponent.prototype) as any;
            component.showSubmitted = () => undefined; // its 1s timer would otherwise fire after the spec ends
            component.parent = {
                id: 'block-1', policyId: 'policy-1', dryRun: false,
                relayerAccount: false, getRef: () => null, getAutosaveId: () => 'autosave'
            };
            component.dataForm = { getRawValue: () => ({ place: {} }) };
            component.storage = { delete: () => undefined };
            component.tablePersist = tablePersist;
            component.geoFilePersist = geoFilePersist;
            component.policyEngineService = { setBlockDataWithResult: vi.fn() };

            await component.onSubmit(false);

            expect(tablePersist.rollbackIpfsUploads).toHaveBeenCalled();
            expect(geoFilePersist.rollbackGridFsUploads).not.toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });

        it('does not roll back geo files for a new version', async () => {
            const closed = new Subject<boolean>();
            const component = Object.create(VCFullscreenDialog.prototype) as any;
            component.dialog = { open: () => ({ onClose: closed }) };
            component.dataForm = { valid: true, getRawValue: () => ({ place: {} }) };
            component.tablePersist = tablePersist;
            component.geoFilePersist = geoFilePersist;
            component.policyEngineService = { createNewVersionVcDocument: vi.fn() };
            component.policyId = 'policy-1';
            component.documentId = 'doc-1';
            component.allVcDocs = [{}];

            component.onUpdatableBtnEvent();
            closed.next(true);
            for (let index = 0; index < 5; index++)
                await Promise.resolve();

            expect(tablePersist.rollbackIpfsUploads).toHaveBeenCalled();
            expect(geoFilePersist.rollbackGridFsUploads).not.toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });
    });
});
