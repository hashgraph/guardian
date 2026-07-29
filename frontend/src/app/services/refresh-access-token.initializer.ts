import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';

/**
 * App initializer that refreshes the access token before the app boots.
 *
 * The access token lives only ~60s, and the periodic refresh timer
 * (AuthStateService) is in-memory, so it never survives a page reload. That
 * leaves the access token in localStorage almost always expired on a fresh
 * start, and the bootstrap requests (session, branding, profile, settings)
 * would be sent with it and rejected with 401 — cluttering the console.
 *
 * Exchanging the long-lived (30-day) refresh token for a fresh access token
 * here, before those requests fire, keeps the session alive and the console
 * clean. If no refresh token is stored, there is nothing to restore. If the
 * refresh fails (refresh token expired/invalid), the stale credentials are
 * dropped so the app starts on the login page instead of firing doomed
 * requests; the error interceptor performs the redirect.
 */
export async function refreshAccessTokenOnStartup(): Promise<void> {
    const auth = inject(AuthService);

    if (!auth.getRefreshToken()) {
        return;
    }

    // Resolve before the first await, while the injection context is active.
    const authState = inject(AuthStateService);

    try {
        await firstValueFrom(auth.updateAccessToken());
    } catch {
        authState.clearSession();
    }
}
