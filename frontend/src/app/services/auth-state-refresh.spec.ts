import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AppThemeService } from './app-theme.service';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';
import { environment } from '../../environments/environment';

// A signed-in session refreshes its access token on a timer. A refresh the auth service refuses
// (the refresh token is missing or no longer valid) means the session is over: it must end instead
// of retrying forever with no way out.
describe('AuthStateService periodic token refresh', () => {
    let auth: MockedObject<AuthService>;
    const interval = environment.accessTokenUpdateInterval || 29 * 1000;

    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.setItem('accessToken', 'token');
        localStorage.setItem('refreshToken', 'refresh');
        auth = {
            getUserKey: vi.fn().mockReturnValue('user-a'),
            updateAccessToken: vi.fn(),
            removeAccessToken: vi.fn(() => localStorage.removeItem('accessToken')),
            removeUsername: vi.fn(),
        } as unknown as MockedObject<AuthService>;
        TestBed.configureTestingModule({
            providers: [
                AuthStateService,
                { provide: AppThemeService, useValue: { applyForUser: vi.fn(), reset: vi.fn() } },
                { provide: AuthService, useValue: auth },
            ]
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    });

    const signedIn = () => {
        const state = TestBed.inject(AuthStateService);
        state.updateState(true);
        return state;
    };

    for (const status of [401, 403, 422]) {
        it(`ends the session when the refresh is refused with ${status}`, async () => {
            auth.updateAccessToken.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
            const state = signedIn();

            vi.advanceTimersByTime(interval);

            expect(await firstValueFrom(state.value)).toBe(false);
            expect(localStorage.getItem('refreshToken')).toBeNull();
            vi.advanceTimersByTime(interval * 3);
            expect(auth.updateAccessToken).toHaveBeenCalledTimes(1);
        });
    }

    it('keeps the session through a refresh that fails for another reason, and tries again', async () => {
        auth.updateAccessToken.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
        const state = signedIn();

        vi.advanceTimersByTime(interval * 2);

        expect(await firstValueFrom(state.value)).toBe(true);
        expect(auth.updateAccessToken).toHaveBeenCalledTimes(2);
    });

    it('keeps refreshing while the refresh succeeds', async () => {
        auth.updateAccessToken.mockReturnValue(of('new-token'));
        const state = signedIn();

        vi.advanceTimersByTime(interval * 2);

        expect(await firstValueFrom(state.value)).toBe(true);
        expect(auth.updateAccessToken).toHaveBeenCalledTimes(2);
    });
});
