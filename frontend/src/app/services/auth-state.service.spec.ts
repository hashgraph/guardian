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
    let theme: jasmine.SpyObj<AppThemeService>;
    let auth: jasmine.SpyObj<AuthService>;

    beforeEach(() => {
        theme = jasmine.createSpyObj<AppThemeService>('AppThemeService', ['applyForUser', 'reset']);
        auth = jasmine.createSpyObj<AuthService>('AuthService', ['getUserId', 'updateAccessToken']);
        auth.getUserId.and.returnValue('user-a');

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
        theme.reset.calls.reset();

        state.updateState(false);

        expect(theme.reset).toHaveBeenCalled();
    });
});
