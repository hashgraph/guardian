import { of, throwError } from 'rxjs';
import { WipeRequestsDialogComponent } from './wipe-requests-dialog.component';

describe('WipeRequestsDialogComponent', () => {
    let contractService: any;

    function create(data: any = {}): any {
        return new WipeRequestsDialogComponent(
            contractService,
            { close: () => {} } as any,
            { data: { contractId: '0.0.1', version: '1.0.0', ...data } } as any,
        );
    }

    beforeEach(() => {
        contractService = {
            getWipeRequests: jasmine.createSpy('getWipeRequests')
                .and.returnValue(of({ body: [], headers: { get: () => null } })),
            approveWipeRequest: jasmine.createSpy('approveWipeRequest').and.returnValue(of({})),
            rejectWipeRequest: jasmine.createSpy('rejectWipeRequest').and.returnValue(of({})),
        };
    });

    // The template reads `requests.length` on its first render, before the async load
    // resolves, so an uninitialised list threw in change detection.
    it('starts with an empty request list so the first render cannot throw', () => {
        expect(create().requests).toEqual([] as any);
    });

    it('loads the page and reads the total from the header', () => {
        const headers = new Map<string, string>([['X-Total-Count', '7']]);
        contractService.getWipeRequests.and.returnValue(of({
            body: [{ id: 'r1', user: 'u' }],
            headers: { get: (k: string) => headers.get(k) },
        }));
        const c = create();
        c.loadRequests();
        expect(c.requests.length).toBe(1);
        expect(c.length).toBe(7);
    });

    it('falls back to the empty state when the request list fails to load', () => {
        contractService.getWipeRequests.and.returnValue(of({
            body: [{ id: 'r1', user: 'u' }],
            headers: { get: () => '1' },
        }));
        const c = create();
        c.loadRequests();
        expect(c.requests.length).toBe(1);

        contractService.getWipeRequests.and.returnValue(throwError(() => new Error('boom')));
        c.loadRequests();
        expect(c.requests).toEqual([] as any);
        expect(c.length).toBe(0);
        expect(c.loading).toBe(false);
    });
});
