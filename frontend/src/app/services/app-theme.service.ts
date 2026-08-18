import { Injectable, OnDestroy } from '@angular/core';

export type AppTheme = 'light' | 'dark' | 'system';

export interface AppThemeOption {
    label: string;
    value: AppTheme;
    icon: string;
}

/**
 * Per-user, because a browser is shared.
 *
 * A single global key meant the theme one account chose was applied to the next
 * account that signed in on the same machine, and survived signing out. The
 * legacy key is still read once as a fallback so an existing preference is not
 * silently lost on upgrade.
 */
const APP_THEME_STORAGE_KEY = 'GUARDIAN_APP_THEME';

function storageKeyForUser(userId: string | null): string {
    return userId ? `${APP_THEME_STORAGE_KEY}:${userId}` : APP_THEME_STORAGE_KEY;
}
const LIGHT_CLASS = 'guardian-theme-light';
const DARK_CLASS = 'guardian-theme-dark';

@Injectable({
    providedIn: 'root'
})
export class AppThemeService implements OnDestroy {
    public readonly themes: AppThemeOption[] = [
        { label: 'Light', value: 'light', icon: 'pi pi-sun' },
        { label: 'Dark', value: 'dark', icon: 'pi pi-moon' },
        { label: 'System', value: 'system', icon: 'pi pi-desktop' }
    ];

    private currentTheme: AppTheme = 'light';
    private userId: string | null = null;
    private readonly darkModeQuery: MediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    private readonly onSystemChange = (): void => {
        if (this.currentTheme === 'system') {
            this.applyResolvedTheme();
        }
    };

    constructor() {
        this.darkModeQuery.addEventListener('change', this.onSystemChange);
        this.currentTheme = this.readStoredTheme();
        this.applyResolvedTheme();
    }

    public ngOnDestroy(): void {
        this.darkModeQuery.removeEventListener('change', this.onSystemChange);
    }

    public getCurrentTheme(): AppTheme {
        return this.currentTheme;
    }

    public setTheme(theme: AppTheme): void {
        this.currentTheme = this.findTheme(theme).value;
        localStorage.setItem(storageKeyForUser(this.userId), this.currentTheme);
        this.applyResolvedTheme();
    }

    /**
     * Adopt the preference belonging to `userId`. Called on sign-in, so the theme
     * follows the account rather than the machine.
     */
    public applyForUser(userId: string | null): void {
        this.userId = userId;
        this.currentTheme = this.readStoredTheme();
        this.applyResolvedTheme();
    }

    /**
     * Drop back to the default on sign-out, without touching anyone's stored
     * preference - the next sign-in reads its own.
     */
    public reset(): void {
        this.userId = null;
        this.currentTheme = this.themes[0].value;
        this.applyResolvedTheme();
    }

    private readStoredTheme(): AppTheme {
        const stored = localStorage.getItem(storageKeyForUser(this.userId));
        if (stored !== null) {
            return this.findTheme(stored).value;
        }
        // nothing chosen under this account yet: fall back to the pre-upgrade global
        // key, so an existing preference is not silently lost on upgrade
        return this.findTheme(localStorage.getItem(APP_THEME_STORAGE_KEY)).value;
    }

    private applyResolvedTheme(): void {
        const root = document.documentElement;
        root.classList.remove(LIGHT_CLASS, DARK_CLASS);
        root.classList.add(this.isDarkActive() ? DARK_CLASS : LIGHT_CLASS);
    }

    private isDarkActive(): boolean {
        if (this.currentTheme === 'system') {
            return this.darkModeQuery.matches;
        }
        return this.currentTheme === 'dark';
    }

    private findTheme(theme: string | null): AppThemeOption {
        return this.themes.find((item) => item.value === theme) || this.themes[0];
    }
}
