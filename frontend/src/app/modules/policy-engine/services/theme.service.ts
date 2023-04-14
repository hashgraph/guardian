import { Injectable } from '@angular/core';
import { PolicyBlockModel, Theme, ThemeRule, ThemeSettings } from '../structures';
import { byRolesTheme } from '../themes/by-roles';
import { defaultTheme } from '../themes/default';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private storage: ThemeSettings;

    constructor() {
        this.storage = new ThemeSettings([
            defaultTheme,
            byRolesTheme
        ]);
        this.load();
    }

    public load(): Theme[] {
        return this.storage.load();
    }

    public save(): void {
        this.storage.save();
    }

    public create(): Theme[] {
        const theme = new Theme();
        theme.name = 'New Theme';
        return this.storage.add(theme);
    }

    public delete(theme: Theme): Theme[] {
        return this.storage.delete(theme);
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
}