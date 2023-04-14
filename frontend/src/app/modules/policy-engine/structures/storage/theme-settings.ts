import { Theme } from './theme';

export class ThemeSettings {
    private _all!: Theme[];
    private _current!: Theme;
    private _currentTheme: any;
    private _customThemes: Theme[];
    private _defaultThemes: Theme[];

    constructor(defaultThemes?: any[]) {
        this._currentTheme = '';
        this._customThemes = [];
        this._defaultThemes = [];
        this._all = [];
        if (Array.isArray(defaultThemes)) {
            this._defaultThemes = defaultThemes.map(t => Theme.from(t));
        }
        this._current = this._defaultThemes[0];
    }

    public load() {
        this._all = [];
        try {
            for (const defaultTheme of this._defaultThemes) {
                this._all.push(defaultTheme.clone());
            }

            this._current = this._all[0];

            this._customThemes = [];
            const array = localStorage.getItem('POLICY_SETTINGS_THEMES');
            if (typeof array === 'string' && array.startsWith('[')) {
                const value: any[] = JSON.parse(array);
                if (Array.isArray(value)) {
                    this._customThemes = value.map(t => Theme.from(t));
                }
            }

            for (const theme of this._customThemes) {
                this._all.push(theme);
            }

            this._currentTheme = localStorage.getItem('POLICY_SETTINGS_THEME') || '0';
            if (this._all[this._currentTheme]) {
                this._current = this._all[this._currentTheme];
            }

            return this._all;
        } catch (error) {
            console.error(error);
            return this._all;
        }
    }

    public save() {
        try {
            const array = this._customThemes.map(t => t.toJson());
            localStorage.setItem('POLICY_SETTINGS_THEME', String(this._currentTheme));
            localStorage.setItem('POLICY_SETTINGS_THEMES', JSON.stringify(array));
        } catch (error) {
            console.error(error);
        }
    }

    public saveTheme() {
        try {
            localStorage.setItem('POLICY_SETTINGS_THEME', String(this._currentTheme));
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
            this._currentTheme = String(this._all.indexOf(v));
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


    public add(theme: Theme): Theme[] {
        this._current = theme;
        this._all.push(theme);
        this._customThemes.push(theme);
        return this._all;
    }
}
