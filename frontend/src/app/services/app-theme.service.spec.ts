import { TestBed } from '@angular/core/testing';
import { AppThemeService } from './app-theme.service';

const GLOBAL_KEY = 'GUARDIAN_APP_THEME';
const DARK_CLASS = 'guardian-theme-dark';
const LIGHT_CLASS = 'guardian-theme-light';

/*
 * A browser is shared. With a single global storage key, the theme one account
 * chose was applied to the next account that signed in on the same machine, and
 * survived signing out.
 */
describe('AppThemeService', () => {
    let service: AppThemeService;

    const keysToClear = [GLOBAL_KEY, `${GLOBAL_KEY}:user-a`, `${GLOBAL_KEY}:user-b`];

    beforeEach(() => {
        keysToClear.forEach((key) => localStorage.removeItem(key));
        TestBed.configureTestingModule({ providers: [AppThemeService] });
        service = TestBed.inject(AppThemeService);
    });

    afterEach(() => {
        keysToClear.forEach((key) => localStorage.removeItem(key));
        document.documentElement.classList.remove(LIGHT_CLASS, DARK_CLASS);
    });

    it('stores the choice under the signed-in user', () => {
        service.applyForUser('user-a');
        service.setTheme('dark');

        expect(localStorage.getItem(`${GLOBAL_KEY}:user-a`)).toBe('dark');
    });

    it('does not carry one user\'s theme over to the next', () => {
        service.applyForUser('user-a');
        service.setTheme('dark');

        service.applyForUser('user-b');

        expect(service.getCurrentTheme()).toBe('light');
        expect(document.documentElement.classList.contains(DARK_CLASS)).toBeFalse();
    });

    it('restores a user\'s own theme when they sign back in', () => {
        service.applyForUser('user-a');
        service.setTheme('dark');
        service.applyForUser('user-b');

        service.applyForUser('user-a');

        expect(service.getCurrentTheme()).toBe('dark');
        expect(document.documentElement.classList.contains(DARK_CLASS)).toBeTrue();
    });

    it('drops back to the default on sign-out without discarding the preference', () => {
        service.applyForUser('user-a');
        service.setTheme('dark');

        service.reset();

        expect(service.getCurrentTheme()).toBe('light');
        expect(localStorage.getItem(`${GLOBAL_KEY}:user-a`)).toBe('dark');
    });

    it('adopts a preference stored under the pre-upgrade global key', () => {
        localStorage.setItem(GLOBAL_KEY, 'dark');

        service.applyForUser('user-a');

        expect(service.getCurrentTheme()).toBe('dark');
    });

    it('prefers the user\'s own choice over the pre-upgrade global key', () => {
        localStorage.setItem(GLOBAL_KEY, 'dark');
        localStorage.setItem(`${GLOBAL_KEY}:user-a`, 'light');

        service.applyForUser('user-a');

        expect(service.getCurrentTheme()).toBe('light');
    });
});
