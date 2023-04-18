import { Theme } from './theme';

export class ThemeSettings {
    private _all!: Theme[];
    private _current!: Theme;
    private _customThemes: Theme[];
    private _defaultThemes: Theme[];

    constructor(defaultThemes?: any[]) {
        this._customThemes = [];
        this._defaultThemes = [];
        this._all = [];
        if (Array.isArray(defaultThemes)) {
            this._defaultThemes = defaultThemes.map(t => Theme.from(t));
        }
        this._current = this._defaultThemes[0];
    }

    public load(): void {
        this._all = [];
        try {
            for (const defaultTheme of this._defaultThemes) {
                this._all.push(defaultTheme.clone());
            }
            const json = localStorage.getItem('POLICY_SETTINGS_THEME');
            if (json) {
                const currentTheme = Theme.fromString(json);
                this._current = currentTheme || this._all[0];
            } else {
                this._current = this._all[0];
            }
        } catch (error) {
            this._current = this._all[0];
            console.error(error);
        }
    }

    public save() {
        try {
            if (this._current) {
                localStorage.setItem('POLICY_SETTINGS_THEME', this._current.toString());
            } else {
                localStorage.setItem('POLICY_SETTINGS_THEME', '');
            }
        } catch (error) {
            console.error(error);
        }
    }

    public get themes(): Theme[] {
        return this._all;
    }

    public get currentTheme(): Theme {
        return this._current;
    }

    public set currentTheme(v: Theme) {
        if (this._current !== v) {
            this._current = v;
        }
    }

    public delete(theme: Theme): Theme[] {
        this._customThemes = this._customThemes.filter(t => t !== theme);
        this._all = this.themes.filter(t => t !== theme);
        if (this._current === theme) {
            this._current = this._all[0];
        }
        return this._all;
    }

    public add(theme: Theme | Theme[]): Theme[] {
        if (Array.isArray(theme)) {
            for (const t of theme) {
                this._add(t);
            }
        } else {
            this._add(theme);
        }
        return this._all;
    }

    public set(themes: Theme[]): Theme[] {
        const id = this._current?.id;
        this._all = [];
        this._customThemes = [];
        for (const defaultTheme of this._defaultThemes) {
            const theme = defaultTheme.clone();
            this._all.push(theme);
            if (theme.id === id) {
                this._current = theme;
            }
        }
        for (const theme of themes) {
            this._all.push(theme);
            this._customThemes.push(theme);
            if (theme.id === id) {
                this._current = theme;
            }
        }
        return this._all;
    }

    private _checkName(theme: Theme) {
        for (const t of this._all) {
            if (theme.name === t.name) {
                theme.name = theme.name + `_${Date.now()}`;
            }
        }
    }

    private _add(theme: Theme): void {
        this._checkName(theme);
        this._current = theme;
        this._all.push(theme);
        this._customThemes.push(theme);
    }
}
