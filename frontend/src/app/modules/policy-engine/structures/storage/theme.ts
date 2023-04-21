import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyBlockModel } from '..';
import { ThemeRule } from './theme-rule';

export class Theme {
    public id: string;
    public uuid: string;
    public readonly: boolean;

    private _name: string;
    private _rules: ThemeRule[];
    private _defaultRole: ThemeRule;

    private _colorMap: Map<number, any>;

    constructor() {
        this.id = '';
        this.uuid = GenerateUUIDv4();
        this.readonly = false;
        this._name = '';
        this._rules = [];
        this._defaultRole = new ThemeRule(this);
        this._defaultRole.default = true;
        this._defaultRole.description = 'Default';
        this._colorMap = new Map();
    }

    public get name(): string {
        return this._name;
    }

    public set name(v: string) {
        this._name = v;
    }

    public get rules(): ThemeRule[] {
        return this._rules;
    }

    public get default(): ThemeRule {
        return this._defaultRole;
    }

    public update(): void {
        this._colorMap.clear();
        for (let i = 0; i < this._rules.length; i++) {
            this._colorMap.set(1 << i, this._rules[i]);
        }
    }

    public addRule(rule: ThemeRule): void {
        if (rule.default) {
            this._defaultRole = rule;
        } else {
            this._rules.push(rule);
        }
    }

    public createRule(): ThemeRule {
        const rule = new ThemeRule(this);
        this._rules.push(rule);
        return rule;
    }

    public deleteRule(rule: ThemeRule): void {
        this._rules = this._rules.filter(r => r != rule);
    }

    public getStyle(item: PolicyBlockModel): any {
        try {
            let styleNumber = 0;
            for (let i = 0; i < this._rules.length; i++) {
                if (this._rules[i].check(item)) {
                    styleNumber = (styleNumber) | (1 << i);
                }
            }
            if (this._colorMap.has(styleNumber)) {
                return this._colorMap.get(styleNumber);
            } else {
                return this.mergeStyle(styleNumber);
            }
        } catch (error) {
            return null;
        }
    }

    private mergeStyle(styleNumber: number): any {
        if (styleNumber) {
            const styles = [];
            for (let i = 0; i < this._rules.length; i++) {
                if ((styleNumber) & (1 << i)) {
                    styles.push(this._rules[i].style);
                }
            }
            if (styles.length > 1) {
                const style = Object.assign({}, styles[0]);
                let delta = 100 / styles.length;
                let percent = 0;
                let gradient = 'linear-gradient(135deg';
                for (const s of styles) {
                    gradient += ', ' + s['--theme-background'] + ' ' + percent + '%';
                    percent += delta;
                    gradient += ', ' + s['--theme-background'] + ' ' + percent + '%';
                }
                gradient += ')';
                style['--theme-background'] = gradient;
                this._colorMap.set(styleNumber, style);
                return style;
            } else {
                const style = styles[0];
                this._colorMap.set(styleNumber, style);
                return style;
            }
        } else {
            this._colorMap.set(styleNumber, this._defaultRole.style);
            return this._defaultRole.style;
        }
    }

    public getStyleByIndex(index: number): any {
        return this._rules[index]?.style;
    }

    public clone(): Theme {
        return Theme.from(this.toJson());
    }

    public downRule(rule: ThemeRule) {
        const index = this._rules.findIndex(r => r === rule);
        if (index > -1 && index < this._rules.length - 1) {
            this._rules[index] = this._rules[index + 1];
            this._rules[index + 1] = rule;
        }
        this._rules = this._rules.slice();
    }

    public upRule(rule: ThemeRule) {
        const index = this._rules.findIndex(r => r === rule);
        if (index > 0 && index < this._rules.length) {
            this._rules[index] = this._rules[index - 1];
            this._rules[index - 1] = rule;
        }
        this._rules = this._rules.slice();
    }

    public toJson(): any {
        const rules = this._rules.map(r => r.toJson());
        rules.push(this._defaultRole.toJson());
        return {
            id: this.id,
            uuid: this.uuid,
            readonly: this.readonly,
            name: this._name,
            rules
        }
    }

    public toString(): string {
        return JSON.stringify(this.toJson());
    }

    public static from(json: any): Theme {
        const theme = new Theme();
        theme.id = json.id || theme.id;
        theme.uuid = json.uuid || theme.uuid;
        theme._name = json.name || '';
        theme.readonly = json.readonly || false;
        if (Array.isArray(json.rules)) {
            for (const rule of json.rules) {
                theme.addRule(ThemeRule.from(theme, rule))
            }
        }
        return theme;
    }

    public static fromString(item: string): Theme | null {
        try {
            const json = JSON.parse(item);
            if (
                typeof json === 'object' &&
                json.name &&
                json.uuid &&
                Array.isArray(json.rules)
            ) {
                return Theme.from(json);
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }
}
