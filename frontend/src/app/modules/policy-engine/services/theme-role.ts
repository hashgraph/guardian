import { PolicyBlockModel } from '../structures';
import { Theme } from './theme';

export class ThemeRole {
    public readonly theme: Theme;
    private _text: string;
    private _background: string;
    private _border: string;
    private _style: any;
    private _shape: string;

    public _filterType: string;
    public _filterOperation: string;
    public _filterValue: any;

    constructor(theme: Theme) {
        this.theme = theme;
        this._text = '#000';
        this._background = '#fff';
        this._border = '#000';
        this._shape = '0';

        this._filterType = 'all';
        this._filterOperation = 'eq';
        this._filterValue = '';

        this._update();
    }

    public get text(): string {
        return this._text;
    }

    public set text(v: string) {
        if (this._text !== v) {
            this._text = v;
            this.update();
        }
    }

    public get background(): string {
        return this._background;
    }

    public set background(v: string) {
        if (this._background !== v) {
            this._background = v;
            this.update();
        }
    }

    public get border(): string {
        return this._border;
    }

    public set border(v: string) {
        if (this._border !== v) {
            this._border = v;
            this.update();
        }
    }

    public get shape(): string {
        return this._shape;
    }

    public set shape(v: string) {
        if (this._shape !== v) {
            this._shape = v;
            this.update();
        }
    }

    public get style(): any {
        return this._style;
    }

    public get filterOperation(): string {
        return this._filterOperation;
    }

    public set filterOperation(v: string) {
        if (this._filterOperation !== v) {
            this._filterOperation = v;
        }
    }

    public get filterType(): string {
        return this._filterType;
    }

    public set filterType(v: string) {
        if (this._filterType !== v) {
            this._filterType = v;
        }
    }

    public get filterValue(): any {
        return this._filterValue;
    }

    public set filterValue(v: any) {
        if (this._filterValue !== v) {
            this._filterValue = v;
        }
    }

    public _update(): void {
        this._style = {
            '--theme-color': this._text,
            '--theme-border-color': this._border,
            '--theme-background-color': this._background,
            '--theme-border-radius': ''
        };
        switch (this._shape) {
            case '0':
                this._style['--theme-border-radius'] = '0px';
                break;
            case '1':
                this._style['--theme-border-radius'] = '6px';
                break;
            case '2':
                this._style['--theme-border-radius'] = '20px';
                break;
        }
    }

    public update(): void {
        this._update();
        this.theme.update();
    }

    public delete(): void {
        this.theme.deleteRole(this);
        this.theme.update();
    }

    public check(item: PolicyBlockModel): boolean {
        if (this._filterType === 'type') {
            if (this._filterOperation === 'eq') {
                return item.blockType === this._filterValue;
            } else if (this._filterOperation === 'in' && this._filterValue.includes) {
                return this._filterValue.includes(item.blockType);
            }
        } else if (this._filterType === 'role') {

        } else if (this._filterType === 'prop') {

        } else if (this._filterType === 'all') {
            return true;
        }
        return false;
    }

    public static from(theme: Theme, json: any): ThemeRole {
        const role = new ThemeRole(theme);
        role._text = json.text;
        role._background = json.background;
        role._border = json.border;
        role._shape = json.shape;
        role._filterType = json.filterType;
        role._filterOperation = json.filterOperation;
        role._filterValue = json.filterValue;
        role._update();
        return role;
    }
}