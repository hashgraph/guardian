import { PolicyBlock } from '../policy-models/block/block.model';
import { PolicyFolder } from '../policy-models/interfaces/types';
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
    private _type: string;
    private _singleValue: string;
    private _multipleValue: string[];
    private _filterValue: any;
    private _filterOperation: any;
    private _default: boolean;
    private _legend: string;
    private _model: PolicyFolder | null;

    constructor(theme: Theme) {
        this.theme = theme;
        this._description = '';
        this._text = '#000';
        this._background = '#fff';
        this._border = '#000';
        this._shape = '0';
        this._borderStyle = 'solid';
        this._borderWidth = '2px';
        this._default = false;
        this._legend = '';
        this._model = null;
        this._type = 'type';
        this._singleValue = '';
        this._multipleValue = [];
        this._updateCondition();
        this._updateStyle();
    }

    public get description(): string {
        return this._description;
    }

    public set description(v: string) {
        if (this._description !== v) {
            this._description = v;
            this._legend = v || '-';
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

    public get singleValue(): string {
        return this._singleValue;
    }

    public get multipleValue(): string[] {
        return this._multipleValue;
    }

    public set singleValue(v: string) {
        this._singleValue = v;
        this._updateCondition();
    }

    public set multipleValue(v: string[]) {
        this._multipleValue = v;
        this._updateCondition();
    }

    public get default(): boolean {
        return this._default;
    }

    public set default(v: boolean) {
        if (this._default !== v) {
            this._default = v;
            this._updateCondition();
        }
    }

    public get legend(): string {
        return this._legend;
    }

    public updateLegend(model: PolicyFolder) {
        this._model = model;
        if (this.type === 'role') {
            let names = '';
            for (const role of this.getMultipleValue()) {
                const name = this._model?.getPermissionsName(role);
                if (name) {
                    if (names) {
                        names = names + ', ' + name;
                    } else {
                        names = name;
                    }
                }
            }
            this._legend = this.description || '-';
            if (names) {
                this._legend = this._legend + ' (' + names + ')';
            } else {
                this._legend = this._legend + ' (-)';
            }
        }
    }

    public getValue(): null | string | string[] {
        if (this._type === 'all' || this._default) {
            return null;
        }
        if (this._type === 'type' || this._type === 'role') {
            return this._multipleValue;
        }
        if (this._type === 'api' || this._type === 'custom') {
            return this._singleValue;
        }
        return null;
    }

    public getMultipleValue(): string[] {
        if ((this._type === 'type' || this._type === 'role') && this._multipleValue) {
            return this._multipleValue;
        }
        if ((this._type === 'api' || this._type === 'custom') && this._singleValue) {
            return [this._singleValue];
        }
        return [];
    }

    public setValue(value: null | string | string[]) {
        if (this._type === 'all' || this._default) {
            this._singleValue = '';
            this._multipleValue = [];
        }
        if (this._type === 'type' || this._type === 'role') {
            this._singleValue = '';
            if (typeof value === 'string') {
                this._multipleValue = [value];
            } else if (Array.isArray(value)) {
                this._multipleValue = value;
            } else {
                this._multipleValue = [];
            }
            return;
        }
        if (this._type === 'api' || this._type === 'custom') {
            if (typeof value === 'string') {
                this._singleValue = value;
            } else {
                this._singleValue = '';
            }
            this._multipleValue = [];
            return;
        }
        return;
    }

    public _updateCondition(): void {
        if (this._type === 'all' || this._default) {
            this._type = 'all';
            this._filterOperation = 'eq';
            this._filterValue = '';
            return;
        }
        if (this._type === 'type' || this._type === 'role') {
            if (Array.isArray(this._multipleValue)) {
                if (this._multipleValue.length > 1) {
                    this._filterOperation = 'in';
                    this._filterValue = {};
                    for (const v of this._multipleValue) {
                        this._filterValue[v] = true;
                    }
                } else {
                    this._filterOperation = 'eq';
                    this._filterValue = this._multipleValue[0];

                }
            } else {
                this._filterOperation = 'eq';
                this._filterValue = this._multipleValue;
            }
            return;
        }
        if (this._type === 'api' || this._type === 'custom') {
            this._filterOperation = 'eq';
            this._filterValue = this._singleValue;
            return;
        }
    }

    public _updateStyle(): void {
        this._style = {
            '--theme-color': this._text,
            '--theme-border-color': this._border,
            '--theme-background': this._background,
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

    public check(item: PolicyBlock): boolean {
        if (this._type === 'type') {
            if (this._filterOperation === 'in') {
                return this._filterValue[item.blockType] === true;
            } else {
                return item.blockType === this._filterValue;
            }
        }
        if (this._type === 'role') {
            if (this._filterOperation === 'in') {
                for (const r of item.permissionsNumber) {
                    if (this._filterValue[r] === true) {
                        return true;
                    }
                }
                return false;
            } else {
                return item.permissionsNumber.includes(this._filterValue);
            }
        }
        if (this._type === 'api') {
            if (this._filterValue === 'post') {
                return item.postApi && item.getApi;
            }
            if (this._filterValue === 'get') {
                return !item.postApi && item.getApi;
            }
            return !item.postApi && !item.getApi;
        }
        if (this._type === 'custom') {
            return true;
        }
        if (this._type === 'all') {
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
        rule._default = json.default;
        rule._type = json.filterType;
        rule._legend = rule._description || '-';
        rule.setValue(json.filterValue);
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
            filterValue: this.getValue(),
            default: this._default
        }
    }
}
