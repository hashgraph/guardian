import type { MockedObject } from "vitest";
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TimeoutError } from 'rxjs';
import { AuthService } from './auth.service';
import { PROFILE_PUSH_TIMEOUT_MS, ProfileService } from './profile.service';
import { ToastService } from './toast.service';

describe('ProfileService profile pushes', () => {
    let service: ProfileService;
    let http: HttpTestingController;
    let toast: MockedObject<ToastService>;
    let auth: { requireUsername: () => string };

    beforeEach(() => {
        auth = { requireUsername: () => 'user' };
        toast = {
            error: vi.fn().mockName("ToastService.error")
        } as unknown as MockedObject<ToastService>;
        TestBed.configureTestingModule({
            providers: [
                ProfileService,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: AuthService, useValue: auth },
                { provide: ToastService, useValue: toast },
            ],
        });
        service = TestBed.inject(ProfileService);
        http = TestBed.inject(HttpTestingController);
    });

    const pushes: [
        string,
        () => any,
        string
    ][] = [
        ['pushSetProfile', () => service.pushSetProfile({} as any), '/profiles/push/user'],
        ['restoreProfile', () => service.restoreProfile({} as any), '/profiles/restore/user'],
    ];

    pushes.forEach(([name, call, path]) => {
        describe(name, () => {
            it('delivers the task of a push that is answered', () => {
                const received: any[] = [];
                call().subscribe((result: any) => received.push(result));

                http.expectOne((request) => request.url.endsWith(path)).flush({ taskId: 'task', expectation: 3 });

                expect(received).toEqual([{ taskId: 'task', expectation: 3 }]);
                expect(toast.error).not.toHaveBeenCalled();
            });

            it('fails with a timeout and tells the user when the request is never answered', fakeAsync(() => {
                let failure: unknown;
                call().subscribe({ error: (error: unknown) => failure = error });

                tick(PROFILE_PUSH_TIMEOUT_MS - 1);
                expect(failure).toBeUndefined();
                tick(1);

                expect(failure).toBeInstanceOf(TimeoutError);
                expect(toast.error).toHaveBeenCalledTimes(1);
                expect(toast.error).toHaveBeenCalledWith(expect.any(String), 'Request timed out');
            }));

            it('leaves the message of an HTTP error to the error interceptor', () => {
                let failure: unknown;
                call().subscribe({ error: (error: unknown) => failure = error });

                http.expectOne((request) => request.url.endsWith(path)).flush('boom', { status: 500, statusText: 'Server Error' });

                expect(failure).toBeInstanceOf(HttpErrorResponse);
                expect(toast.error).not.toHaveBeenCalled();
            });
        });
    });

    it('fails without sending a request when there is no signed-in user', () => {
        auth.requireUsername = () => { throw new Error('There is no signed-in user'); };
        let failure: unknown;

        service.getBalance().subscribe({ error: (error: unknown) => failure = error });

        http.expectNone(() => true);
        expect((failure as Error).message).toBe('There is no signed-in user');
    });
});
