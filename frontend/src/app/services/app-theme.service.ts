import { Injectable } from '@angular/core';

export type AppTheme = 'light' | 'dark';

export interface AppThemeOption {
    label: string;
    value: AppTheme;
    className: string;
}

const APP_THEME_STORAGE_KEY = 'GUARDIAN_APP_THEME';

@Injectable({
    providedIn: 'root'
})
export class AppThemeService {
    public readonly themes: AppThemeOption[] = [
        { label: 'Light', value: 'light', className: 'guardian-theme-light' },
        { label: 'Dark', value: 'dark', className: 'guardian-theme-dark' }
    ];

    private currentTheme: AppTheme = 'light';

    constructor() {
        this.currentTheme = this.readStoredTheme();
        this.applyTheme(this.currentTheme);
    }

    public getCurrentTheme(): AppTheme {
        return this.currentTheme;
    }

    public setTheme(theme: AppTheme): void {
        this.currentTheme = this.findTheme(theme).value;
        localStorage.setItem(APP_THEME_STORAGE_KEY, this.currentTheme);
        this.applyTheme(this.currentTheme);
    }

    private readStoredTheme(): AppTheme {
        const storedTheme = localStorage.getItem(APP_THEME_STORAGE_KEY);
        return storedTheme === 'dark' ? 'dark' : 'light';
    }

    private applyTheme(theme: AppTheme): void {
        const root = document.documentElement;
        const themeConfig = this.findTheme(theme);

        root.classList.remove(...this.themes.map((item) => item.className));
        root.classList.add(themeConfig.className);
    }

    private findTheme(theme: AppTheme): AppThemeOption {
        return this.themes.find((item) => item.value === theme) || this.themes[0];
    }
}
