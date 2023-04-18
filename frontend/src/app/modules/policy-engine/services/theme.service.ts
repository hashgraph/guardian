import { Injectable } from '@angular/core';
import { PolicyBlockModel, Theme, ThemeRule, ThemeSettings } from '../structures';
import { byRolesTheme } from '../themes/by-roles';
import { defaultTheme } from '../themes/default';
import { byApiTheme } from '../themes/by-api';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private storage: ThemeSettings;

    constructor() {
        this.storage = new ThemeSettings([
            defaultTheme,
            byRolesTheme,
            byApiTheme
        ]);
        this.load();
    }

    public load(): Theme[] {
        return this.storage.load();
    }

    public save(): void {
        this.storage.save();
    }

    public create(name?: string): Theme {
        const theme = new Theme();
        theme.name = name || 'New Theme';
        this.storage.add(theme);
        return theme;
    }

    public delete(theme: Theme): void {
        this.storage.delete(theme);
    }

    public getThemes(): Theme[] {
        return this.storage.themes;
    }

    public setTheme(theme: Theme) {
        this.storage.currentTheme = theme;
    }

    public saveTheme() {
        this.storage.saveTheme();
    }

    public getStyle(item: PolicyBlockModel): any {
        return this.storage.currentTheme.getStyle(item);
    }

    public getStyleByIndex(index: number): any {
        return this.storage.currentTheme.getStyleByIndex(index);
    }

    public getStyleByRule(item: ThemeRule): any {
        return item.style;
    }

    public current(): Theme {
        return this.storage.currentTheme;
    }

    public import(json: any): Theme {
        const theme = Theme.from(json);
        theme.readonly = false;
        this.storage.add(theme);
        return theme;
    }
}