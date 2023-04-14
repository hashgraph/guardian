import { PolicyBlockModel } from '..';
import { Theme } from './theme';

export class ThemeRule {
    public readonly theme: Theme;
    private _description: string;
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
        this._description = '';
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

    public get description(): string {
        return this._description;
    }

    public set description(v: string) {
        if (this._description !== v) {
            this._description = v;
        }
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
                this._filterValue = {}
                for (const v of this._value) {
                    this._filterValue[v] = true;
                }
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
            '--theme-border-radius': '',
            '--theme-border-width': this._borderWidth,
        };
        switch (this._shape) {
            case '0':
                this._style['--theme-border-radius'] = '0px';
                this._style['--theme-border-style'] = 'solid';
                break;
            case '1':
                this._style['--theme-border-radius'] = '6px';
                this._style['--theme-border-style'] = 'solid';
                break;
            case '2':
                this._style['--theme-border-radius'] = '20px';
                this._style['--theme-border-style'] = 'solid';
                break;
            case '3':
                this._style['--theme-border-radius'] = '0px';
                this._style['--theme-border-style'] = 'dashed';
                break;
            case '4':
                this._style['--theme-border-radius'] = '6px';
                this._style['--theme-border-style'] = 'dashed';
                break;
            case '5':
                this._style['--theme-border-radius'] = '20px';
                this._style['--theme-border-style'] = 'dashed';
                break;
        }
    }

    public update(): void {
        this._updateCondition();
        this._updateStyle();
        this.theme.update();
    }

    public delete(): void {
        this.theme.deleteRule(this);
        this.theme.update();
    }

    public check(item: PolicyBlockModel): boolean {
        if (this._type === 'type') {
            if (this._filterOperation === 'eq') {
                return item.blockType === this._filterValue;
            } else if (this._filterOperation === 'in') {
                return this._filterValue[item.blockType] === true;
            }
        } else if (this._type === 'role') {
            if (this._filterOperation === 'eq') {
                return item.permissionsNumber.includes(this._filterValue);
            } else if (this._filterOperation === 'in') {
                for (const r of item.permissionsNumber) {
                    if (this._filterValue[r] === true) {
                        return true;
                    }
                }
                return false;
            }
        } else if (this._type === 'api') {
            if (this._filterValue === 'post') {
                return item.postApi && item.getApi;
            }
            if (this._filterValue === 'get') {
                return !item.postApi && item.getApi;
            }
            return !item.postApi && !item.getApi;
        } else if (this._type === 'prop') {
            return false;
        } else if (this._type === 'all') {
            return true;
        }
        return false;
    }

    public static from(theme: Theme, json: any): ThemeRule {
        const rule = new ThemeRule(theme);
        rule._description = json.description;
        rule._text = json.text;
        rule._background = json.background;
        rule._border = json.border;
        rule._shape = json.shape;
        rule._borderWidth = json.borderWidth;
        rule._type = json.filterType;
        rule._filterOperation = json.filterOperation;
        rule._value = json.filterValue;
        rule._updateCondition();
        rule._updateStyle();
        return rule;
    }

    public toJson(): any {
        return {
            description: this._description,
            text: this._text,
            background: this._background,
            border: this._border,
            shape: this._shape,
            borderWidth: this._borderWidth,
            filterType: this._type,
            filterOperation: this._filterOperation,
            filterValue: this._value
        }
    }
}