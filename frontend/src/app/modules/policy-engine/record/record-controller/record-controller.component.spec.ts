import { of, Subject, throwError } from 'rxjs';
import { ConfirmDialog } from 'src/app/modules/common/confirm-dialog/confirm-dialog.component';
import { SavePolicyTestRecordDialog } from '../save-policy-test-record-dialog/save-policy-test-record-dialog.component';
import { RecordControllerComponent } from './record-controller.component';

describe('RecordControllerComponent stop flow', () => {
    let component: RecordControllerComponent;
    let recordService: jasmine.SpyObj<any>;
    let dialog: jasmine.SpyObj<any>;
    let policyTest: jasmine.SpyObj<any>;
    let pauseResult: Subject<boolean>;
    let warningClose: Subject<boolean>;
    let saveClose: Subject<any>;
    let anchorClick: jasmine.Spy;

    beforeEach(() => {
        pauseResult = new Subject<boolean>();
        warningClose = new Subject<boolean>();
        saveClose = new Subject<any>();
        recordService = jasmine.createSpyObj('RecordService', [
            'pauseRecording',
            'resumeRecording',
            'stopRecording',
        ]);
        recordService.pauseRecording.and.returnValue(pauseResult);
        recordService.resumeRecording.and.returnValue(of(true));
        recordService.stopRecording.and.returnValue(of(new ArrayBuffer(0)));
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
        policyTest = jasmine.createSpyObj('PolicyTestAutomationService', [
            'shouldWarnBeforeStop',
            'setMetadata',
            'getRecordMetadata',
            'reset',
        ], {
            state: { name: 'Draft', description: 'Description' },
        });
        policyTest.shouldWarnBeforeStop.and.returnValue(false);
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

    it('opens the save dialog only after pause succeeds', () => {
        component.stopRecording();
        expect(recordService.pauseRecording).toHaveBeenCalledOnceWith('policy-1');
        expect(dialog.open).not.toHaveBeenCalledWith(
            SavePolicyTestRecordDialog,
            jasmine.anything()
        );
        pauseResult.next(true);
        expect(component.recording).toBeFalse();
        expect(dialog.open).toHaveBeenCalledWith(
            SavePolicyTestRecordDialog,
            jasmine.anything()
        );
    });

    it('does not open the save dialog when pause fails', () => {
        recordService.pauseRecording.and.returnValue(throwError(() => new Error('pause')));
        component.stopRecording();
        expect(component.recording).toBeTrue();
        expect(dialog.open).not.toHaveBeenCalled();
    });

    it('does not pause when the no-output warning is canceled', () => {
        policyTest.shouldWarnBeforeStop.and.returnValue(true);
        component.stopRecording();
        warningClose.next(false);
        expect(recordService.pauseRecording).not.toHaveBeenCalled();
        expect(component.recording).toBeTrue();
    });

    it('pauses after the no-output warning is confirmed', () => {
        policyTest.shouldWarnBeforeStop.and.returnValue(true);
        component.stopRecording();
        warningClose.next(true);
        expect(recordService.pauseRecording).toHaveBeenCalledOnceWith('policy-1');
    });

    it('resumes the same recording when the save dialog returns null', () => {
        component.stopRecording();
        pauseResult.next(true);
        saveClose.next(null);
        expect(recordService.resumeRecording).toHaveBeenCalledOnceWith('policy-1');
        expect(recordService.stopRecording).not.toHaveBeenCalled();
        expect(component.recording).toBeTrue();
        expect(policyTest.reset).not.toHaveBeenCalled();
    });

    it('keeps the stopped UI when resume fails', () => {
        recordService.resumeRecording.and.returnValue(throwError(() => new Error('resume')));
        component.stopRecording();
        pauseResult.next(true);
        saveClose.next(null);
        expect(component.recording).toBeFalse();
    });

    it('uses the existing stop request for Save', () => {
        component.stopRecording();
        pauseResult.next(true);
        saveClose.next({ name: 'Saved', description: 'Text' });
        expect(policyTest.setMetadata).toHaveBeenCalledWith('Saved', 'Text');
        expect(recordService.stopRecording).toHaveBeenCalledWith(
            'policy-1',
            { policyTest: jasmine.objectContaining({ name: 'Saved', description: 'Text' }) }
        );
        expect(anchorClick).toHaveBeenCalledTimes(1);
    });

    it('uses the existing stop request for Stop & Discard', () => {
        component.stopRecording();
        pauseResult.next(true);
        saveClose.next({ name: '', description: '', saveToFile: false });
        expect(recordService.stopRecording).toHaveBeenCalledWith(
            'policy-1',
            { policyTest: jasmine.objectContaining({ name: '', description: '' }) }
        );
        expect(component.recording).toBeFalse();
        expect(policyTest.reset).toHaveBeenCalled();
        expect(anchorClick).not.toHaveBeenCalled();
    });

    it('ignores repeated Stop clicks while the flow is pending', () => {
        component.stopRecording();
        component.stopRecording();
        expect(recordService.pauseRecording).toHaveBeenCalledTimes(1);
        pauseResult.next(true);
        expect(dialog.open).toHaveBeenCalledTimes(1);
    });

    it('allows a new stop flow after warning Cancel', () => {
        policyTest.shouldWarnBeforeStop.and.returnValue(true);
        component.stopRecording();
        warningClose.next(false);
        component.stopRecording();
        expect(dialog.open).toHaveBeenCalledTimes(2);
    });
});
