import type { Mock, MockedObject } from "vitest";
import { of, Subject, throwError } from 'rxjs';
import { ConfirmDialog } from 'src/app/modules/common/confirm-dialog/confirm-dialog.component';
import { SavePolicyTestRecordDialog } from '../save-policy-test-record-dialog/save-policy-test-record-dialog.component';
import { RecordControllerComponent } from './record-controller.component';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('RecordControllerComponent stop flow', () => {
    let component: RecordControllerComponent;
    let recordService: MockedObject<any>;
    let dialog: MockedObject<any>;
    let policyTest: MockedObject<any>;
    let pauseResult: Subject<boolean>;
    let warningClose: Subject<boolean>;
    let saveClose: Subject<any>;
    let policyTestState: any;
    let anchorClick: Mock;

    beforeEach(() => {
        pauseResult = new Subject<boolean>();
        warningClose = new Subject<boolean>();
        saveClose = new Subject<any>();
        recordService = {
            pauseRecording: vi.fn().mockName("RecordService.pauseRecording"),
            resumeRecording: vi.fn().mockName("RecordService.resumeRecording"),
            stopRecording: vi.fn().mockName("RecordService.stopRecording"),
            getRecordedActions: vi.fn().mockName("RecordService.getRecordedActions"),
            getStatus: vi.fn().mockName("RecordService.getStatus")
        };
        recordService.pauseRecording.mockReturnValue(pauseResult);
        recordService.resumeRecording.mockReturnValue(of(true));
        recordService.stopRecording.mockReturnValue(of(new ArrayBuffer(0)));
        recordService.getRecordedActions.mockReturnValue(of([]));
        recordService.getStatus.mockReturnValue(of(null));
        dialog = {
            open: vi.fn().mockName("DialogService.open")
        };
        dialog.open.mockImplementation((type: any) => {
            if (type === ConfirmDialog) {
                return { onClose: warningClose };
            }
            if (type === SavePolicyTestRecordDialog) {
                return { onClose: saveClose };
            }
            return { onClose: new Subject() };
        });
        policyTestState = { name: 'Draft', description: 'Description', stopStage: null };
        policyTest = {
            shouldWarnBeforeStop: vi.fn().mockName("PolicyTestAutomationService.shouldWarnBeforeStop"),
            setMetadata: vi.fn().mockName("PolicyTestAutomationService.setMetadata"),
            getRecordMetadata: vi.fn().mockName("PolicyTestAutomationService.getRecordMetadata"),
            reset: vi.fn().mockName("PolicyTestAutomationService.reset"),
            setStopStage: vi.fn().mockName("PolicyTestAutomationService.setStopStage"),
            ensureLoaded: vi.fn().mockName("PolicyTestAutomationService.ensureLoaded"),
            state: policyTestState
        };
        policyTest.shouldWarnBeforeStop.mockReturnValue(false);
        policyTest.ensureLoaded.mockReturnValue(Promise.resolve());
        policyTest.setStopStage.mockImplementation((stage: any) => {
            policyTestState.stopStage = stage;
            return Promise.resolve();
        });
        policyTest.getRecordMetadata.mockReturnValue({ outputActions: { a: 'b' } });
        vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:record');
        anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
        component = new RecordControllerComponent({
            recordSubscribe: vi.fn().mockName("WebSocketService.recordSubscribe")
        } as any, dialog, recordService, {
            navigate: vi.fn().mockName("Router.navigate")
        } as any, dialog, policyTest);
        component.policyId = 'policy-1';
        component.recording = true;
    });

    it('opens the save dialog only after pause succeeds', async () => {
        component.stopRecording();
        expect(recordService.pauseRecording).toHaveBeenCalledTimes(1);
        expect(recordService.pauseRecording).toHaveBeenCalledWith('policy-1');
        expect(dialog.open).not.toHaveBeenCalledWith(SavePolicyTestRecordDialog, expect.anything());
        pauseResult.next(true);
        await flush();
        expect(component.recording).toBe(false);
        expect(dialog.open).toHaveBeenCalledWith(SavePolicyTestRecordDialog, expect.anything());
    });

    it('opens the save dialog only after the stage is stored', async () => {
        let storeResolve: () => void = () => { };
        policyTest.setStopStage.mockImplementation(() => new Promise<void>((resolve) => {
            storeResolve = resolve;
        }));
        component.stopRecording();
        pauseResult.next(true);
        await flush();
        expect(dialog.open).not.toHaveBeenCalled();
        storeResolve();
        await flush();
        expect(dialog.open).toHaveBeenCalledWith(SavePolicyTestRecordDialog, expect.anything());
    });

    it('waits for the draft to load before choosing a dialog', async () => {
        let loadResolve: () => void = () => { };
        policyTest.ensureLoaded.mockReturnValue(new Promise<void>((resolve) => {
            loadResolve = resolve;
        }));
        policyTest.shouldWarnBeforeStop.mockReturnValue(false);
        recordService.pauseRecording.mockReturnValue(of(true));
        component.stopRecording();
        await flush();
        expect(dialog.open).not.toHaveBeenCalled();
        policyTest.shouldWarnBeforeStop.mockReturnValue(true);
        loadResolve();
        await flush();
        expect(policyTest.setStopStage).toHaveBeenCalledWith('warning');
        expect(dialog.open).toHaveBeenCalledTimes(1);
        expect(dialog.open).toHaveBeenCalledWith(ConfirmDialog, expect.anything());
    });

    it('does not open the save dialog when pause fails', () => {
        recordService.pauseRecording.mockReturnValue(throwError(() => new Error('pause')));
        component.stopRecording();
        expect(component.recording).toBe(true);
        expect(dialog.open).not.toHaveBeenCalled();
    });

    it('clears the stale recording panel when pause answers falsy', async () => {
        recordService.pauseRecording.mockReturnValue(of(false));
        recordService.getStatus.mockReturnValue(of(null));
        component.stopRecording();
        await flush();
        expect(recordService.getStatus).toHaveBeenCalledWith('policy-1');
        expect(component.recording).toBe(false);
        expect(dialog.open).not.toHaveBeenCalled();
    });

    it('allows a new stop flow after a falsy pause', async () => {
        recordService.pauseRecording.mockReturnValue(of(false));
        component.stopRecording();
        await flush();
        recordService.pauseRecording.mockReturnValue(of(true));
        component.stopRecording();
        await flush();
        expect(dialog.open).toHaveBeenCalledWith(SavePolicyTestRecordDialog, expect.anything());
    });

    it('restores a still-active recording when resume answers falsy', async () => {
        recordService.pauseRecording.mockReturnValue(of(true));
        recordService.resumeRecording.mockReturnValue(of(false));
        recordService.getStatus.mockReturnValue(of({
            type: 'Recording',
            uuid: 'record-1',
            status: 'Recording',
            pausedAt: null
        }));
        component.stopRecording();
        await flush();
        expect(component.recording).toBe(false);
        saveClose.next(null);
        await flush();
        expect(recordService.getStatus).toHaveBeenCalledWith('policy-1');
        expect(component.recording).toBe(true);
    });

    it('reopens the stop flow when resume answers falsy on a paused recording', async () => {
        recordService.pauseRecording.mockReturnValue(of(true));
        recordService.resumeRecording.mockReturnValue(of(false));
        component.stopRecording();
        await flush();
        recordService.getStatus.mockReturnValue(of({
            type: 'Recording',
            uuid: 'record-1',
            status: 'Recording',
            pausedAt: 1757500000000
        }));
        saveClose.next(null);
        await flush();
        expect(component.recording).toBe(false);
        expect(dialog.open).toHaveBeenCalledTimes(2);
    });

    it('pauses before the no-output warning is shown', async () => {
        policyTest.shouldWarnBeforeStop.mockReturnValue(true);
        recordService.pauseRecording.mockReturnValue(of(true));
        component.stopRecording();
        await flush();
        expect(recordService.pauseRecording).toHaveBeenCalledTimes(1);
        expect(recordService.pauseRecording).toHaveBeenCalledWith('policy-1');
        expect(dialog.open).toHaveBeenCalledWith(ConfirmDialog, expect.anything());
        expect(policyTest.setStopStage).toHaveBeenCalledWith('warning');
        expect(component.recording).toBe(false);
    });

    it('resumes the paused recording when the no-output warning is canceled', async () => {
        policyTest.shouldWarnBeforeStop.mockReturnValue(true);
        recordService.pauseRecording.mockReturnValue(of(true));
        component.stopRecording();
        await flush();
        warningClose.next(false);
        expect(policyTest.setStopStage).toHaveBeenCalledWith(null);
        expect(recordService.resumeRecording).toHaveBeenCalledTimes(1);
        expect(recordService.resumeRecording).toHaveBeenCalledWith('policy-1');
        expect(component.recording).toBe(true);
    });

    it('moves to the save dialog when the no-output warning is confirmed', async () => {
        policyTest.shouldWarnBeforeStop.mockReturnValue(true);
        recordService.pauseRecording.mockReturnValue(of(true));
        component.stopRecording();
        await flush();
        warningClose.next(true);
        await flush();
        expect(recordService.pauseRecording).toHaveBeenCalledTimes(1);
        expect(policyTest.setStopStage).toHaveBeenCalledWith('save');
        expect(dialog.open).toHaveBeenCalledWith(SavePolicyTestRecordDialog, expect.anything());
    });

    it('omits the metadata on Save after a confirmed warning', async () => {
        policyTest.shouldWarnBeforeStop.mockReturnValue(true);
        recordService.pauseRecording.mockReturnValue(of(true));
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
        expect(recordService.resumeRecording).toHaveBeenCalledTimes(1);
        expect(recordService.resumeRecording).toHaveBeenCalledWith('policy-1');
        expect(recordService.stopRecording).not.toHaveBeenCalled();
        expect(component.recording).toBe(true);
        expect(policyTest.reset).not.toHaveBeenCalled();
    });

    it('keeps the stopped UI when resume fails', async () => {
        recordService.resumeRecording.mockReturnValue(throwError(() => new Error('resume')));
        component.stopRecording();
        pauseResult.next(true);
        await flush();
        saveClose.next(null);
        expect(component.recording).toBe(false);
    });

    it('uses the existing stop request for Save', async () => {
        component.stopRecording();
        pauseResult.next(true);
        await flush();
        saveClose.next({ name: 'Saved', description: 'Text' });
        expect(policyTest.setMetadata).toHaveBeenCalledWith('Saved', 'Text');
        expect(recordService.stopRecording).toHaveBeenCalledWith('policy-1', { policyTest: expect.objectContaining({ name: 'Saved', description: 'Text' }) });
        expect(anchorClick).toHaveBeenCalledTimes(1);
    });

    it('uses the existing stop request for Stop & Discard', async () => {
        component.stopRecording();
        pauseResult.next(true);
        await flush();
        saveClose.next({ name: '', description: '', saveToFile: false });
        expect(recordService.stopRecording).toHaveBeenCalledWith('policy-1', { policyTest: expect.objectContaining({ name: '', description: '' }) });
        expect(component.recording).toBe(false);
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
        policyTest.shouldWarnBeforeStop.mockReturnValue(true);
        recordService.pauseRecording.mockReturnValue(of(true));
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
        expect(component.recording).toBe(false);
        expect(dialog.open).toHaveBeenCalledTimes(1);
        expect(dialog.open).toHaveBeenCalledWith(ConfirmDialog, expect.anything());
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
        expect(dialog.open).toHaveBeenCalledTimes(1);
        expect(dialog.open).toHaveBeenCalledWith(SavePolicyTestRecordDialog, expect.anything());
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
        expect(dialog.open).toHaveBeenCalledTimes(1);
        expect(dialog.open).toHaveBeenCalledWith(SavePolicyTestRecordDialog, expect.anything());
    });

    it('reopens the stored warning when the draft loads after the restore starts', async () => {
        let loadResolve: () => void = () => { };
        policyTest.ensureLoaded.mockReturnValue(new Promise<void>((resolve) => {
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
        expect(dialog.open).toHaveBeenCalledTimes(1);
        expect(dialog.open).toHaveBeenCalledWith(ConfirmDialog, expect.anything());
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
        expect(component.recording).toBe(true);
    });
});
