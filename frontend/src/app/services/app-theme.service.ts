import { Injectable, OnDestroy } from '@angular/core';

export type AppTheme = 'light' | 'dark' | 'system';

export interface AppThemeOption {
    label: string;
    value: AppTheme;
}

const APP_THEME_STORAGE_KEY = 'GUARDIAN_APP_THEME';
const LIGHT_CLASS = 'guardian-theme-light';
const DARK_CLASS = 'guardian-theme-dark';

@Injectable({
    providedIn: 'root'
})
export class AppThemeService implements OnDestroy {
    public readonly themes: AppThemeOption[] = [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'System', value: 'system' }
    ];

    private currentTheme: AppTheme = 'light';
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
        localStorage.setItem(APP_THEME_STORAGE_KEY, this.currentTheme);
        this.applyResolvedTheme();
    }

    private readStoredTheme(): AppTheme {
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
