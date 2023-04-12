import { Injectable } from '@angular/core';
import { defaultTheme } from '../themes/default';
import { ThemeRole } from './theme-role';
import { Theme } from './theme';
import { PolicyBlockModel } from '../structures';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    public themes: Theme[];
    public currentTheme: Theme;

    constructor() {
        this.themes = [];
        this.themes.push(Theme.from(defaultTheme))
        this.themes.forEach(t => t.readonly = true);
        this.currentTheme = this.themes[0];
    }

    public load(): Theme[] {
        return this.themes;
    }

    public save(): void {
    }

    public create(): Theme[] {
        const theme = new Theme();
        theme.name = 'New Theme';
        this.themes.push(theme);
        this.currentTheme = theme;
        return this.themes;
    }

    public delete(theme: Theme): Theme[] {
        this.themes = this.themes.filter(t => t !== theme);
        this.currentTheme = this.themes[0];
        return this.themes;
    }

    public getThemes(): Theme[] {
        return this.themes;
    }

    public setTheme(theme: Theme) {
        this.currentTheme = theme;
    }

    public getStyle(item: PolicyBlockModel): any {
        return this.currentTheme.getStyle(item);
    }

    public getStyleByIndex(index: number): any {
        return this.currentTheme.getStyleByIndex(index);
    }

    public getStyleByRole(item: ThemeRole): any {
        return item.style;
    }

    public current(): Theme {
        return this.currentTheme;
    }
}