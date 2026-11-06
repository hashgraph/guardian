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
    let toast: jasmine.SpyObj<ToastService>;

    beforeEach(() => {
        toast = jasmine.createSpyObj('ToastService', ['error']);
        TestBed.configureTestingModule({
            providers: [
                ProfileService,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: AuthService, useValue: { getUsername: () => 'user' } },
                { provide: ToastService, useValue: toast },
            ],
        });
        service = TestBed.inject(ProfileService);
        http = TestBed.inject(HttpTestingController);
    });

    const pushes: [string, () => any, string][] = [
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
                expect(toast.error).toHaveBeenCalledOnceWith(jasmine.any(String), 'Request timed out');
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
});
