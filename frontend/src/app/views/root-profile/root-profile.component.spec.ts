import { of, Subject, Subscription } from 'rxjs';
import { OperationMode, RootProfileComponent } from './root-profile.component';

describe('RootProfileComponent.onAsyncCompleted', () => {
    // The component has a dozen dependencies the handler does not touch: build it without them.
    const createComponent = (task: unknown) => {
        const component: any = Object.create(RootProfileComponent.prototype);
        component.taskId = 'task';
        component.operationMode = OperationMode.Generate;
        component.loading = true;
        component.taskService = { get: vi.fn().mockReturnValue(of(task)) };
        component.toastService = {
            error: vi.fn().mockName("ToastService.error")
        };
        component.hederaForm = {
            patchValue: vi.fn().mockName("FormGroup.patchValue")
        };
        return component;
    };

    it('fills the Hedera credentials from the result of the generate task', () => {
        const component = createComponent({ result: { id: '0.0.1', key: 'secret' } });

        component.onAsyncCompleted();

        expect(component.hederaForm.patchValue).toHaveBeenCalledTimes(1);

        expect(component.hederaForm.patchValue).toHaveBeenCalledWith({ hederaAccountId: '0.0.1', hederaAccountKey: 'secret' });
        expect(component.loading).toBe(false);
    });

    it('releases the spinner and tells the user when the task body carries no result', () => {
        const component = createComponent({ taskId: 'task' });

        component.onAsyncCompleted();

        expect(component.loading).toBe(false);
        expect(component.toastService.error).toHaveBeenCalledTimes(1);
        expect(component.toastService.error).toHaveBeenCalledWith(expect.any(String), 'Result missing');
        expect(component.hederaForm.patchValue).not.toHaveBeenCalled();
    });
});

describe('RootProfileComponent opening on the general tab', () => {
    // Every profile request stays pending until the test answers it, in the order it was made.
    const createComponent = () => {
        const profileRequests: Subject<any>[] = [];
        const component: any = Object.create(RootProfileComponent.prototype);
        component.subscriptions = new Subscription();
        component.tabs = ['general', 'relayerAccounts', 'credentials'];
        component.hederaForm = { setValue: vi.fn() };
        component.route = { queryParams: of({}), snapshot: { queryParams: {} } };
        component.cdRef = { detectChanges: vi.fn() };
        component.auth = { getOtpStatus: () => of({}) };
        component.settingsService = { getAbout: () => of({ version: '1' }) };
        component.headerProps = { setLoading: vi.fn() };
        component.schemaService = { getSystemSchemasByEntity: () => of({}) };
        component.profileService = {
            getProfile: () => {
                const request = new Subject<any>();
                profileRequests.push(request);
                return request;
            },
            getBalance: () => of('1 ℏ'),
        };
        component.otherService = { pushGetRandomKey: () => of({ taskId: 'generate-task', expectation: 3 }) };
        return { component, profileRequests };
    };

    const answer = (request: Subject<any>) => {
        request.next({ confirmed: false, failed: false });
        request.complete();
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('keeps the progress of a Generate clicked as soon as the wizard shows', () => {
        const { component, profileRequests } = createComponent();
        component.ngOnInit();

        answer(profileRequests[0]);
        vi.advanceTimersByTime(500);
        expect(component.loading).toBe(false); // the wizard is shown

        component.randomKey();
        profileRequests.slice(1).forEach(answer);
        vi.advanceTimersByTime(500);

        expect(component.taskId).toBe('generate-task');
        expect(component.loading).toBe(true);
    });
});
