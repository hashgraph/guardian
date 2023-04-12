import { PolicyBlockModel } from '../structures';
import { Theme } from './theme';

export class ThemeRole {
    public readonly theme: Theme;
    private _text: string;
    private _background: string;
    private _border: string;
    private _style: any;
    private _shape: string;
    private _borderStyle: string;
    private _borderWidth: string;

    public _type: string;
    public _value: any;
    public _filterValue: any;
    public _filterOperation: any;

    constructor(theme: Theme) {
        this.theme = theme;
        this._text = '#000';
        this._background = '#fff';
        this._border = '#000';
        this._shape = '0';
        this._borderStyle = 'solid';
        this._borderWidth = '2px';
    
        this._type = 'all';
        this._value = '';

        this._updateCondition();
        this._updateStyle();
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

    public get borderWidth(): string {
        return this._borderWidth;
    }

    public set borderWidth(v: string) {
        if (this._borderWidth !== v) {
            this._borderWidth = v;
            this.update();
        }
    }

    public get borderStyle(): string {
        return this._borderStyle;
    }

    public set borderStyle(v: string) {
        if (this._borderStyle !== v) {
            this._borderStyle = v;
            this.update();
        }
    }

    public get style(): any {
        return this._style;
    }

    public get type(): string {
        return this._type;
    }

    public set type(v: string) {
        if (this._type !== v) {
            this._type = v;
        }
    }

    public get value(): any {
        return this._value;
    }

    public set value(v: any) {
        if (this._value !== v) {
            this._value = v;
            this._updateCondition();
        }
    }

    public _updateCondition(): void {
        if (Array.isArray(this._value)) {
            if (this._value.length > 1) {
                this._filterValue = this._value;
                this._filterOperation = 'in';
            } else {
                this._filterValue = this._value[0];
                this._filterOperation = 'eq';
            }
        } else {
            this._filterValue = this._value;
            this._filterOperation = 'eq';
        }
    }

    public _updateStyle(): void {
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
        this._updateCondition();
        this._updateStyle();
        this.theme.update();
    }

    public delete(): void {
        this.theme.deleteRole(this);
        this.theme.update();
    }

    public check(item: PolicyBlockModel): boolean {
        if (this._type === 'type') {
            if (this._filterOperation === 'eq') {
                return item.blockType === this._filterValue;
            } else if (this._filterOperation === 'in') {
                return this._filterValue.includes(item.blockType);
            }
        } else if (this._type === 'role') {

        } else if (this._type === 'prop') {

        } else if (this._type === 'all') {
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
        role._type = json.filterType;
        role._filterOperation = json.filterOperation;
        role._value = json.filterValue;
        role._updateCondition();
        role._updateStyle();
        return role;
    }
}