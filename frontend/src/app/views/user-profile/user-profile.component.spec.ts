import { of, Subject, Subscription } from 'rxjs';
import { UserProfileComponent } from './user-profile.component';

describe('UserProfileComponent opening on the general tab', () => {
    // The component has a dozen dependencies the opening does not touch: build it without them. Every
    // profile request stays pending until the test answers it, in the order it was made.
    const createComponent = () => {
        const profileRequests: Subject<any>[] = [];
        const component: any = Object.create(UserProfileComponent.prototype);
        component.subscription = new Subscription();
        component.tabs = ['general', 'relayerAccounts', 'keys', 'credentials'];
        component.route = { queryParams: of({}), snapshot: { queryParams: {} } };
        component.cdRef = { detectChanges: vi.fn() };
        component.auth = { getOtpStatus: () => of({ enabled: false }), getAggregatedStandardRegistries: () => of([]) };
        component.headerProps = { setLoading: vi.fn() };
        component.schemaService = { getSystemSchemasByEntity: () => of(null) };
        component.vcDocumentType = { setValue: vi.fn() };
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
        vi.advanceTimersByTime(200);
        expect(component.loading).toBe(false); // the wizard is shown

        component.randomKey();
        profileRequests.slice(1).forEach(answer);
        vi.advanceTimersByTime(200);

        expect(component.taskId).toBe('generate-task');
        expect(component.loading).toBe(true);
        component.ngOnDestroy();
    });
});
