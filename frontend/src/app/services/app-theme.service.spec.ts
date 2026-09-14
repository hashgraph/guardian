import { TestBed } from '@angular/core/testing';
import { AppThemeService } from './app-theme.service';

const GLOBAL_KEY = 'GUARDIAN_APP_THEME';
const DARK_CLASS = 'guardian-theme-dark';
const LIGHT_CLASS = 'guardian-theme-light';

describe('AppThemeService', () => {
    let service: AppThemeService;

    const LAST_USER_KEY = 'GUARDIAN_APP_THEME_LAST_USER';

    const keysToClear = [GLOBAL_KEY, LAST_USER_KEY, `${GLOBAL_KEY}:user-a`, `${GLOBAL_KEY}:user-b`];

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

    it('does not write the shared fallback when no one is signed in', () => {
        // the bare key is every not-yet-chosen user's fallback, so writing it here
        // would hand this choice to all of them
        localStorage.setItem(GLOBAL_KEY, 'light');

        service.setTheme('dark');

        expect(localStorage.getItem(GLOBAL_KEY)).toBe('light');
        expect(service.getCurrentTheme()).toBe('dark');
    });

    it('restores the last account on construction, before applyForUser arrives', () => {
        // applyForUser only lands after an HTTP round-trip; without the seed a
        // dark-mode user gets a flash of light on every refresh
        service.applyForUser('user-a');
        service.setTheme('dark');

        const reconstructed = new AppThemeService();

        expect(reconstructed.getCurrentTheme()).toBe('dark');
        reconstructed.ngOnDestroy();
    });

    it('forgets the last account on sign-out', () => {
        service.applyForUser('user-a');
        service.setTheme('dark');
        service.reset();

        const reconstructed = new AppThemeService();

        expect(reconstructed.getCurrentTheme()).toBe('light');
        reconstructed.ngOnDestroy();
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
