import { ObjectProperty } from "./object-prop";

export class PolicySettings {
    private readonly _theme: ObjectProperty<string>;

    constructor() {
        const prefix = 'POLICY_SETTINGS_';
        this._theme = new ObjectProperty(prefix + 'THEME', {
            themeUIText: '#404040',
            themeUIBackground: '#efe5fc',
            themeUIBorder: '#c396fa',

            themeServerText: '#404040',
            themeServerBackground: '#e2f9fe',
            themeServerBorder: '#7bd0e3',

            themeAddonText: '#404040',
            themeAddonBackground: '#ffeeda',
            themeAddonBorder: '#f9b465'
        });
    }

    private setStyle():void {
        try {

        } catch (error) {
            console.error(error);
        }
    }

    public load() {
        try {
            this._theme.load();
            this.setStyle();
        } catch (error) {
            console.error(error);
        }
    }

    public save() {
        try {
            this._theme.save();
        } catch (error) {
            console.error(error);
        }
    }

    public get themeUIText(): string {
        return this._theme.get('themeUIText');
    }
    public set themeUIText(value: string) {
        this._theme.set('themeUIText', value);
        this.setStyle();
    }
    public get themeUIBackground(): string {
        return this._theme.get('themeUIBackground');
    }
    public set themeUIBackground(value: string) {
        this._theme.set('themeUIBackground', value);
        this.setStyle();
    }
    public get themeUIBorder(): string {
        return this._theme.get('themeUIBorder');
    }
    public set themeUIBorder(value: string) {
        this._theme.set('themeUIBorder', value);
        this.setStyle();
    }

    public get themeServerText(): string {
        return this._theme.get('themeServerText');
    }
    public set themeServerText(value: string) {
        this._theme.set('themeServerText', value);
        this.setStyle();
    }
    public get themeServerBackground(): string {
        return this._theme.get('themeServerBackground');
    }
    public set themeServerBackground(value: string) {
        this._theme.set('themeServerBackground', value);
        this.setStyle();
    }
    public get themeServerBorder(): string {
        return this._theme.get('themeServerBorder');
    }
    public set themeServerBorder(value: string) {
        this._theme.set('themeServerBorder', value);
        this.setStyle();
    }

    public get themeAddonText(): string {
        return this._theme.get('themeAddonText');
    }
    public set themeAddonText(value: string) {
        this._theme.set('themeAddonText', value);
        this.setStyle();
    }
    public get themeAddonBackground(): string {
        return this._theme.get('themeAddonBackground');
    }
    public set themeAddonBackground(value: string) {
        this._theme.set('themeAddonBackground', value);
        this.setStyle();
    }
    public get themeAddonBorder(): string {
        return this._theme.get('themeAddonBorder');
    }
    public set themeAddonBorder(value: string) {
        this._theme.set('themeAddonBorder', value);
        this.setStyle();
    } 
}
