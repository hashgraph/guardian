import { of } from 'rxjs';
import { OperationMode, RootProfileComponent } from './root-profile.component';

describe('RootProfileComponent.onAsyncCompleted', () => {
    // The component has a dozen dependencies the handler does not touch: build it without them.
    const createComponent = (task: unknown) => {
        const component: any = Object.create(RootProfileComponent.prototype);
        component.taskId = 'task';
        component.operationMode = OperationMode.Generate;
        component.loading = true;
        component.taskService = { get: jasmine.createSpy('get').and.returnValue(of(task)) };
        component.toastService = jasmine.createSpyObj('ToastService', ['error']);
        component.hederaForm = jasmine.createSpyObj('FormGroup', ['patchValue']);
        return component;
    };

    it('fills the Hedera credentials from the result of the generate task', () => {
        const component = createComponent({ result: { id: '0.0.1', key: 'secret' } });

        component.onAsyncCompleted();

        expect(component.hederaForm.patchValue).toHaveBeenCalledOnceWith({ hederaAccountId: '0.0.1', hederaAccountKey: 'secret' });
        expect(component.loading).toBeFalse();
    });

    it('releases the spinner and tells the user when the task body carries no result', () => {
        const component = createComponent({ taskId: 'task' });

        component.onAsyncCompleted();

        expect(component.loading).toBeFalse();
        expect(component.toastService.error).toHaveBeenCalledOnceWith(jasmine.any(String), 'Result missing');
        expect(component.hederaForm.patchValue).not.toHaveBeenCalled();
    });
});
