import { of, Subject, throwError } from 'rxjs';
import { ConfirmDialog } from 'src/app/modules/common/confirm-dialog/confirm-dialog.component';
import { SavePolicyTestRecordDialog } from '../save-policy-test-record-dialog/save-policy-test-record-dialog.component';
import { RecordControllerComponent } from './record-controller.component';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('RecordControllerComponent stop flow', () => {
    let component: RecordControllerComponent;
    let recordService: jasmine.SpyObj<any>;
    let dialog: jasmine.SpyObj<any>;
    let policyTest: jasmine.SpyObj<any>;
    let pauseResult: Subject<boolean>;
    let warningClose: Subject<boolean>;
    let saveClose: Subject<any>;
    let policyTestState: any;
    let anchorClick: jasmine.Spy;

    beforeEach(() => {
        pauseResult = new Subject<boolean>();
        warningClose = new Subject<boolean>();
        saveClose = new Subject<any>();
        recordService = jasmine.createSpyObj('RecordService', [
            'pauseRecording',
            'resumeRecording',
            'stopRecording',
            'getRecordedActions',
            'getStatus',
        ]);
        recordService.pauseRecording.and.returnValue(pauseResult);
        recordService.resumeRecording.and.returnValue(of(true));
        recordService.stopRecording.and.returnValue(of(new ArrayBuffer(0)));
        recordService.getRecordedActions.and.returnValue(of([]));
        recordService.getStatus.and.returnValue(of(null));
        dialog = jasmine.createSpyObj('DialogService', ['open']);
        dialog.open.and.callFake((type: any) => {
            if (type === ConfirmDialog) {
                return { onClose: warningClose };
            }
            if (type === SavePolicyTestRecordDialog) {
                return { onClose: saveClose };
            }
            return { onClose: new Subject() };
        });
        policyTestState = { name: 'Draft', description: 'Description', stopStage: null };
        policyTest = jasmine.createSpyObj('PolicyTestAutomationService', [
            'shouldWarnBeforeStop',
            'setMetadata',
            'getRecordMetadata',
            'reset',
            'setStopStage',
            'ensureLoaded',
        ], {
            state: policyTestState,
        });
        policyTest.shouldWarnBeforeStop.and.returnValue(false);
        policyTest.ensureLoaded.and.returnValue(Promise.resolve());
        policyTest.setStopStage.and.callFake((stage: any) => {
            policyTestState.stopStage = stage;
            return Promise.resolve();
        });
        policyTest.getRecordMetadata.and.returnValue({ outputActions: { a: 'b' } });
        spyOn(window.URL, 'createObjectURL').and.returnValue('blob:record');
        anchorClick = spyOn(HTMLAnchorElement.prototype, 'click');
        component = new RecordControllerComponent(
            jasmine.createSpyObj('WebSocketService', ['recordSubscribe']),
            dialog,
            recordService,
            jasmine.createSpyObj('Router', ['navigate']),
            dialog,
            policyTest,
        );
        component.policyId = 'policy-1';
        component.recording = true;
    });

    it('opens the save dialog only after pause succeeds', async () => {
        component.stopRecording();
        expect(recordService.pauseRecording).toHaveBeenCalledOnceWith('policy-1');
        expect(dialog.open).not.toHaveBeenCalledWith(
            SavePolicyTestRecordDialog,
            jasmine.anything()
        );
        pauseResult.next(true);
        await flush();
        expect(component.recording).toBeFalse();
        expect(dialog.open).toHaveBeenCalledWith(
            SavePolicyTestRecordDialog,
            jasmine.anything()
        );
    });

    it('opens the save dialog only after the stage is stored', async () => {
        let storeResolve: () => void = () => {};
        policyTest.setStopStage.and.callFake(() => new Promise<void>((resolve) => {
            storeResolve = resolve;
        }));
        component.stopRecording();
        pauseResult.next(true);
        await flush();
        expect(dialog.open).not.toHaveBeenCalled();
        storeResolve();
        await flush();
        expect(dialog.open).toHaveBeenCalledWith(
            SavePolicyTestRecordDialog,
            jasmine.anything()
        );
    });

    it('waits for the draft to load before choosing a dialog', async () => {
        let loadResolve: () => void = () => {};
        policyTest.ensureLoaded.and.returnValue(new Promise<void>((resolve) => {
            loadResolve = resolve;
        }));
        policyTest.shouldWarnBeforeStop.and.returnValue(false);
        recordService.pauseRecording.and.returnValue(of(true));
        component.stopRecording();
        await flush();
        expect(dialog.open).not.toHaveBeenCalled();
        policyTest.shouldWarnBeforeStop.and.returnValue(true);
        loadResolve();
        await flush();
        expect(policyTest.setStopStage).toHaveBeenCalledWith('warning');
        expect(dialog.open).toHaveBeenCalledOnceWith(ConfirmDialog, jasmine.anything());
    });

    it('does not open the save dialog when pause fails', () => {
        recordService.pauseRecording.and.returnValue(throwError(() => new Error('pause')));
        component.stopRecording();
        expect(component.recording).toBeTrue();
        expect(dialog.open).not.toHaveBeenCalled();
    });

    it('clears the stale recording panel when pause answers falsy', async () => {
        recordService.pauseRecording.and.returnValue(of(false));
        recordService.getStatus.and.returnValue(of(null));
        component.stopRecording();
        await flush();
        expect(recordService.getStatus).toHaveBeenCalledWith('policy-1');
        expect(component.recording).toBeFalse();
        expect(dialog.open).not.toHaveBeenCalled();
    });

    it('allows a new stop flow after a falsy pause', async () => {
        recordService.pauseRecording.and.returnValue(of(false));
        component.stopRecording();
        await flush();
        recordService.pauseRecording.and.returnValue(of(true));
        component.stopRecording();
        await flush();
        expect(dialog.open).toHaveBeenCalledWith(
            SavePolicyTestRecordDialog,
            jasmine.anything()
        );
    });

    it('restores a still-active recording when resume answers falsy', async () => {
        recordService.pauseRecording.and.returnValue(of(true));
        recordService.resumeRecording.and.returnValue(of(false));
        recordService.getStatus.and.returnValue(of({
            type: 'Recording',
            uuid: 'record-1',
            status: 'Recording',
            pausedAt: null
        }));
        component.stopRecording();
        await flush();
        expect(component.recording).toBeFalse();
        saveClose.next(null);
        await flush();
        expect(recordService.getStatus).toHaveBeenCalledWith('policy-1');
        expect(component.recording).toBeTrue();
    });

    it('reopens the stop flow when resume answers falsy on a paused recording', async () => {
        recordService.pauseRecording.and.returnValue(of(true));
        recordService.resumeRecording.and.returnValue(of(false));
        component.stopRecording();
        await flush();
        recordService.getStatus.and.returnValue(of({
            type: 'Recording',
            uuid: 'record-1',
            status: 'Recording',
            pausedAt: 1757500000000
        }));
        saveClose.next(null);
        await flush();
        expect(component.recording).toBeFalse();
        expect(dialog.open).toHaveBeenCalledTimes(2);
    });

    it('pauses before the no-output warning is shown', async () => {
        policyTest.shouldWarnBeforeStop.and.returnValue(true);
        recordService.pauseRecording.and.returnValue(of(true));
        component.stopRecording();
        await flush();
        expect(recordService.pauseRecording).toHaveBeenCalledOnceWith('policy-1');
        expect(dialog.open).toHaveBeenCalledWith(ConfirmDialog, jasmine.anything());
        expect(policyTest.setStopStage).toHaveBeenCalledWith('warning');
        expect(component.recording).toBeFalse();
    });

    it('resumes the paused recording when the no-output warning is canceled', async () => {
        policyTest.shouldWarnBeforeStop.and.returnValue(true);
        recordService.pauseRecording.and.returnValue(of(true));
        component.stopRecording();
        await flush();
        warningClose.next(false);
        expect(policyTest.setStopStage).toHaveBeenCalledWith(null);
        expect(recordService.resumeRecording).toHaveBeenCalledOnceWith('policy-1');
        expect(component.recording).toBeTrue();
    });

    it('moves to the save dialog when the no-output warning is confirmed', async () => {
        policyTest.shouldWarnBeforeStop.and.returnValue(true);
        recordService.pauseRecording.and.returnValue(of(true));
        component.stopRecording();
        await flush();
        warningClose.next(true);
        await flush();
        expect(recordService.pauseRecording).toHaveBeenCalledTimes(1);
        expect(policyTest.setStopStage).toHaveBeenCalledWith('save');
        expect(dialog.open).toHaveBeenCalledWith(
            SavePolicyTestRecordDialog,
            jasmine.anything()
        );
    });

    it('omits the metadata on Save after a confirmed warning', async () => {
        policyTest.shouldWarnBeforeStop.and.returnValue(true);
        recordService.pauseRecording.and.returnValue(of(true));
        component.stopRecording();
        await flush();
        warningClose.next(true);
        await flush();
        saveClose.next({ name: 'Saved', description: 'Text' });
        expect(policyTest.getRecordMetadata).not.toHaveBeenCalled();
    });

    it('resumes the same recording when the save dialog returns null', async () => {
        component.stopRecording();
        pauseResult.next(true);
        await flush();
        saveClose.next(null);
        expect(recordService.resumeRecording).toHaveBeenCalledOnceWith('policy-1');
        expect(recordService.stopRecording).not.toHaveBeenCalled();
        expect(component.recording).toBeTrue();
        expect(policyTest.reset).not.toHaveBeenCalled();
    });

    it('keeps the stopped UI when resume fails', async () => {
        recordService.resumeRecording.and.returnValue(throwError(() => new Error('resume')));
        component.stopRecording();
        pauseResult.next(true);
        await flush();
        saveClose.next(null);
        expect(component.recording).toBeFalse();
    });

    it('uses the existing stop request for Save', async () => {
        component.stopRecording();
        pauseResult.next(true);
        await flush();
        saveClose.next({ name: 'Saved', description: 'Text' });
        expect(policyTest.setMetadata).toHaveBeenCalledWith('Saved', 'Text');
        expect(recordService.stopRecording).toHaveBeenCalledWith(
            'policy-1',
            { policyTest: jasmine.objectContaining({ name: 'Saved', description: 'Text' }) }
        );
        expect(anchorClick).toHaveBeenCalledTimes(1);
    });

    it('uses the existing stop request for Stop & Discard', async () => {
        component.stopRecording();
        pauseResult.next(true);
        await flush();
        saveClose.next({ name: '', description: '', saveToFile: false });
        expect(recordService.stopRecording).toHaveBeenCalledWith(
            'policy-1',
            { policyTest: jasmine.objectContaining({ name: '', description: '' }) }
        );
        expect(component.recording).toBeFalse();
        expect(policyTest.reset).toHaveBeenCalled();
        expect(anchorClick).not.toHaveBeenCalled();
    });

    it('ignores repeated Stop clicks while the flow is pending', async () => {
        component.stopRecording();
        component.stopRecording();
        expect(recordService.pauseRecording).toHaveBeenCalledTimes(1);
        pauseResult.next(true);
        await flush();
        expect(dialog.open).toHaveBeenCalledTimes(1);
    });

    it('allows a new stop flow after warning Cancel', async () => {
        policyTest.shouldWarnBeforeStop.and.returnValue(true);
        recordService.pauseRecording.and.returnValue(of(true));
        component.stopRecording();
        await flush();
        warningClose.next(false);
        component.stopRecording();
        await flush();
        expect(dialog.open).toHaveBeenCalledTimes(2);
    });

    it('reopens the warning after a reload when that stage was stored', async () => {
        policyTestState.stopStage = 'warning';
        component['updateRecordLogs']({
            type: 'Recording',
            uuid: 'record-1',
            status: 'Recording',
            pausedAt: 1757500000000
        });
        await flush();
        expect(component.recording).toBeFalse();
        expect(dialog.open).toHaveBeenCalledOnceWith(ConfirmDialog, jasmine.anything());
    });

    it('reopens the save dialog after a reload when that stage was stored', async () => {
        policyTestState.stopStage = 'save';
        component['updateRecordLogs']({
            type: 'Recording',
            uuid: 'record-1',
            status: 'Recording',
            pausedAt: 1757500000000
        });
        await flush();
        expect(dialog.open).toHaveBeenCalledOnceWith(
            SavePolicyTestRecordDialog,
            jasmine.anything()
        );
    });

    it('falls back to the save dialog when no stage was stored', async () => {
        component['updateRecordLogs']({
            type: 'Recording',
            uuid: 'record-1',
            status: 'Recording',
            pausedAt: 1757500000000
        });
        await flush();
        expect(policyTest.setStopStage).toHaveBeenCalledWith('save');
        expect(dialog.open).toHaveBeenCalledOnceWith(
            SavePolicyTestRecordDialog,
            jasmine.anything()
        );
    });

    it('reopens the stored warning when the draft loads after the restore starts', async () => {
        let loadResolve: () => void = () => {};
        policyTest.ensureLoaded.and.returnValue(new Promise<void>((resolve) => {
            loadResolve = resolve;
        }));
        component['updateRecordLogs']({
            type: 'Recording',
            uuid: 'record-1',
            status: 'Recording',
            pausedAt: 1757500000000
        });
        await flush();
        expect(dialog.open).not.toHaveBeenCalled();
        policyTestState.stopStage = 'warning';
        loadResolve();
        await flush();
        expect(dialog.open).toHaveBeenCalledOnceWith(ConfirmDialog, jasmine.anything());
        expect(policyTest.setStopStage).not.toHaveBeenCalledWith('save');
    });

    it('asks the draft service for the policy it is restoring', async () => {
        component['updateRecordLogs']({
            type: 'Recording',
            uuid: 'record-1',
            status: 'Recording',
            pausedAt: 1757500000000
        });
        await flush();
        expect(policyTest.ensureLoaded).toHaveBeenCalledWith('policy-1');
    });

    it('opens no dialog when the status carries no pause boundary', async () => {
        component['updateRecordLogs']({
            type: 'Recording',
            uuid: 'record-1',
            status: 'Recording',
            pausedAt: null
        });
        await flush();
        expect(dialog.open).not.toHaveBeenCalled();
        expect(component.recording).toBeTrue();
    });
});
