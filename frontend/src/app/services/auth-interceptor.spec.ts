import { HttpErrorResponse, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { AuthInterceptor, REFRESH_TIMEOUT_MS } from './auth.service';

// Requests that fail with 401 wait on one shared token refresh and are then retried. A refresh that
// never answers, or fails, must not leave them pending: the page loaders only clear on a response.
describe('AuthInterceptor token refresh', () => {
    const unauthorized = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    let refresh: () => Observable<string>;
    let refreshCalls: number;
    let interceptor: AuthInterceptor;

    const handler = (): HttpHandler => ({
        handle: (req: HttpRequest<any>) => req.headers.get('Authorization') === 'Bearer new-token'
            ? of(new HttpResponse({ status: 200, body: req.url }))
            : throwError(() => unauthorized)
    });

    const send = (url: string) => {
        const outcome: { value?: any; error?: any } = {};
        interceptor.intercept(new HttpRequest('GET', url), handler()).subscribe({
            next: (event) => { outcome.value = event; },
            error: (error) => { outcome.error = error; }
        });
        return outcome;
    };

    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.setItem('accessToken', 'old-token');
        localStorage.setItem('refreshToken', 'refresh-token');
        refreshCalls = 0;
        const auth = { updateAccessToken: () => { refreshCalls++; return refresh(); } };
        interceptor = new AuthInterceptor({ get: () => auth } as any);
    });

    afterEach(() => {
        vi.useRealTimers();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    });

    it('retries every waiting request with the new token after one refresh', () => {
        refresh = () => of('new-token');

        const first = send('/a');
        const second = send('/b');

        expect((first.value as HttpResponse<any>).body).toBe('/a');
        expect((second.value as HttpResponse<any>).body).toBe('/b');
    });

    it('fails the waiting requests with their 401 when the refresh never answers', () => {
        refresh = () => NEVER;

        const first = send('/a');
        const second = send('/b');
        expect(first.error).toBeUndefined();
        vi.advanceTimersByTime(REFRESH_TIMEOUT_MS);

        expect(first.error).toBe(unauthorized);
        expect(second.error).toBe(unauthorized);
        expect(refreshCalls).toBe(1);
    });

    it('fails the waiting requests with their 401 when the refresh is refused', () => {
        refresh = () => throwError(() => new HttpErrorResponse({ status: 422 }));

        const outcome = send('/a');

        expect(outcome.error).toBe(unauthorized);
    });

    it('starts a new refresh for the next 401 once a refresh has failed', () => {
        refresh = () => NEVER;
        send('/a');
        vi.advanceTimersByTime(REFRESH_TIMEOUT_MS);
        refresh = () => of('new-token');

        const outcome = send('/b');

        expect((outcome.value as HttpResponse<any>).body).toBe('/b');
        expect(refreshCalls).toBe(2);
    });
});
