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
        const tableRollback = jasmine.createSpy('tableRollback').and.resolveTo();
        const closed = new Subject<boolean>();
        const component = Object.create(VCFullscreenDialog.prototype) as any;
        component.dialog = { open: () => ({ onClose: closed }) };
        component.dataForm = { getRawValue: () => ({ place: {} }) };
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
        for (let index = 0; index < 5; index++) await Promise.resolve();

        expect(order).toEqual(['tables', 'geo', 'request']);
        expect(tableRollback).toHaveBeenCalled();
        expect(rollback).toHaveBeenCalled();
    });

    it('rolls back tables and geo files when the dialog request fails', async () => {
        const tableRollback = jasmine.createSpy('tableRollback').and.resolveTo();
        const geoRollback = jasmine.createSpy('geoRollback').and.resolveTo();
        const component = Object.create(RequestDocumentBlockDialog.prototype) as any;
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
        spyOn(console, 'error');

        await component.onSubmit(false);
        for (let index = 0; index < 5; index++) await Promise.resolve();

        expect(tableRollback).toHaveBeenCalled();
        expect(geoRollback).toHaveBeenCalled();
        expect(component.loading).toBeFalse();
    });

    describe('when a file upload fails before the request', () => {
        let tablePersist: any;
        let geoFilePersist: any;

        beforeEach(() => {
            tablePersist = {
                persistTablesInDocument: async () => undefined,
                rollbackIpfsUploads: jasmine.createSpy('rollbackIpfsUploads').and.resolveTo()
            };
            geoFilePersist = {
                persistGeoFilesInDocument: async () => {
                    throw new Error('ipfs failed');
                },
                rollbackGridFsUploads: jasmine.createSpy('rollbackGridFsUploads').and.resolveTo()
            };
            spyOn(console, 'error');
        });

        it('rolls back the form uploads, keeps the autosave and sends nothing', async () => {
            const request = jasmine.createSpy('request');
            const deleteAutosave = jasmine.createSpy('delete');
            const component = Object.create(RequestDocumentBlockComponent.prototype) as any;
            component.dataForm = { getRawValue: () => ({ place: {} }) };
            component.storage = { delete: deleteAutosave };
            component.getAutosaveId = () => 'autosave';
            component.tablePersist = tablePersist;
            component.geoFilePersist = geoFilePersist;
            component.policyEngineService = { setBlockDataWithResult: request };
            component.dryRun = false;

            await component.onSubmit(false);

            expect(tablePersist.rollbackIpfsUploads).toHaveBeenCalled();
            expect(geoFilePersist.rollbackGridFsUploads).toHaveBeenCalled();
            expect(request).not.toHaveBeenCalled();
            expect(deleteAutosave).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
        });

        it('rolls back the dialog uploads and sends nothing', async () => {
            const request = jasmine.createSpy('request');
            const deleteAutosave = jasmine.createSpy('delete');
            const component = Object.create(RequestDocumentBlockDialog.prototype) as any;
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
            expect(component.loading).toBeFalse();
        });

        it('rolls back the new-version uploads and sends nothing', async () => {
            const request = jasmine.createSpy('request');
            const closed = new Subject<boolean>();
            const component = Object.create(VCFullscreenDialog.prototype) as any;
            component.dialog = { open: () => ({ onClose: closed }) };
            component.dataForm = { getRawValue: () => ({ place: {} }) };
            component.tablePersist = tablePersist;
            component.geoFilePersist = geoFilePersist;
            component.policyEngineService = { createNewVersionVcDocument: request };
            component.policyId = 'policy-1';
            component.documentId = 'doc-1';
            component.allVcDocs = [{}];

            component.onUpdatableBtnEvent();
            closed.next(true);
            for (let index = 0; index < 5; index++) await Promise.resolve();

            expect(tablePersist.rollbackIpfsUploads).toHaveBeenCalled();
            expect(geoFilePersist.rollbackGridFsUploads).toHaveBeenCalled();
            expect(request).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
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
                rollbackIpfsUploads: jasmine.createSpy('rollbackIpfsUploads').and.resolveTo()
            };
            geoFilePersist = {
                persistGeoFilesInDocument: jasmine.createSpy('persistGeoFilesInDocument').and.resolveTo(),
                rollbackGridFsUploads: jasmine.createSpy('rollbackGridFsUploads').and.resolveTo()
            };
            spyOn(console, 'error');
        });

        it('keeps the geo files of an earlier successful form submit', async () => {
            const component = Object.create(RequestDocumentBlockComponent.prototype) as any;
            component.dataForm = { getRawValue: () => ({ place: {} }) };
            component.storage = { delete: () => undefined };
            component.getAutosaveId = () => 'autosave';
            component.tablePersist = {
                persistTablesInDocument: async () => undefined,
                rollbackIpfsUploads: tablePersist.rollbackIpfsUploads
            };
            component.geoFilePersist = geoFilePersist;
            component.policyEngineService = { setBlockDataWithResult: () => of({}) };
            component.policyTest = { state: { captureNextFormSubmit: false } };
            component.enableAdditionalData = false;
            component.relayerAccount = false;
            component.dryRun = false;
            component.dialogRef = null;
            await component.onSubmit(false);
            for (let index = 0; index < 5; index++) await Promise.resolve();
            expect(geoFilePersist.persistGeoFilesInDocument).toHaveBeenCalledTimes(1);

            component.tablePersist = tablePersist;
            await component.onSubmit(false);

            expect(tablePersist.rollbackIpfsUploads).toHaveBeenCalled();
            expect(geoFilePersist.persistGeoFilesInDocument).toHaveBeenCalledTimes(1);
            expect(geoFilePersist.rollbackGridFsUploads).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
        });

        it('does not roll back geo files in the dialog', async () => {
            const component = Object.create(RequestDocumentBlockDialog.prototype) as any;
            component.parent = {
                id: 'block-1', policyId: 'policy-1', dryRun: false,
                relayerAccount: false, getRef: () => null, getAutosaveId: () => 'autosave'
            };
            component.dataForm = { getRawValue: () => ({ place: {} }) };
            component.storage = { delete: () => undefined };
            component.tablePersist = tablePersist;
            component.geoFilePersist = geoFilePersist;
            component.policyEngineService = { setBlockDataWithResult: jasmine.createSpy('request') };

            await component.onSubmit(false);

            expect(tablePersist.rollbackIpfsUploads).toHaveBeenCalled();
            expect(geoFilePersist.rollbackGridFsUploads).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
        });

        it('does not roll back geo files for a new version', async () => {
            const closed = new Subject<boolean>();
            const component = Object.create(VCFullscreenDialog.prototype) as any;
            component.dialog = { open: () => ({ onClose: closed }) };
            component.dataForm = { getRawValue: () => ({ place: {} }) };
            component.tablePersist = tablePersist;
            component.geoFilePersist = geoFilePersist;
            component.policyEngineService = { createNewVersionVcDocument: jasmine.createSpy('request') };
            component.policyId = 'policy-1';
            component.documentId = 'doc-1';
            component.allVcDocs = [{}];

            component.onUpdatableBtnEvent();
            closed.next(true);
            for (let index = 0; index < 5; index++) await Promise.resolve();

            expect(tablePersist.rollbackIpfsUploads).toHaveBeenCalled();
            expect(geoFilePersist.rollbackGridFsUploads).not.toHaveBeenCalled();
            expect(component.loading).toBeFalse();
        });
    });
});
