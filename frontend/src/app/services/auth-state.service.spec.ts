import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { AppThemeService } from './app-theme.service';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';

/*
 * The theme follows the account, so the state transitions have to drive it: adopt
 * the signing-in user's preference, and drop back to the default when the session
 * ends. The constructor's bootstrap call is not a sign-out and must not reset -
 * that would discard the theme on every page refresh.
 */
describe('AuthStateService — theme scoping', () => {
    let theme: MockedObject<AppThemeService>;
    let auth: MockedObject<AuthService>;

    beforeEach(() => {
        theme = {
            applyForUser: vi.fn().mockName("AppThemeService.applyForUser"),
            reset: vi.fn().mockName("AppThemeService.reset")
        } as unknown as MockedObject<AppThemeService>;
        auth = {
            getUsername: vi.fn().mockName("AuthService.getUsername"),
            updateAccessToken: vi.fn().mockName("AuthService.updateAccessToken")
        } as unknown as MockedObject<AuthService>;
        auth.getUsername.mockReturnValue('user-a');

        TestBed.configureTestingModule({
            providers: [
                AuthStateService,
                { provide: AppThemeService, useValue: theme },
                { provide: AuthService, useValue: auth },
            ]
        });
    });

    const service = () => TestBed.inject(AuthStateService);

    it('does not reset the theme on the bootstrap state', () => {
        service();

        expect(theme.reset).not.toHaveBeenCalled();
        expect(theme.applyForUser).not.toHaveBeenCalled();
    });

    it('adopts the signing-in user\'s theme', () => {
        service().updateState(true);

        expect(theme.applyForUser).toHaveBeenCalledWith('user-a');
    });

    it('resets the theme when the session ends', () => {
        const state = service();
        state.updateState(true);
        theme.reset.mockClear();

        state.updateState(false);

        expect(theme.reset).toHaveBeenCalled();
    });
});
