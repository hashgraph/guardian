import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyBlockModel } from '..';
import { ThemeRule } from './theme-rule';

export class Theme {
    public readonly id: string;
    public readonly: boolean;

    private _name: string;
    private _rules: ThemeRule[];

    constructor() {
        this.id = GenerateUUIDv4();
        this.readonly = false;
        this._name = '';
        this._rules = [];
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

    public update(): void {
    }

    public addRule(): ThemeRule {
        const rule = new ThemeRule(this);
        this._rules.push(rule);
        return rule;
    }

    public deleteRule(rule: ThemeRule): void {
        this._rules = this._rules.filter(r => r != rule);
    }

    public getStyle(item: PolicyBlockModel): any {
        try {
            for (const rule of this._rules) {
                if (rule.check(item)) {
                    return rule.style;
                }
            }
            return null;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public getStyleByIndex(index: number): any {
        return this._rules[index]?.style;
    }

    public static from(json: any): Theme {
        const theme = new Theme();
        theme._name = json.name || '';
        theme.readonly = json.readonly || false;
        if (Array.isArray(json.rules)) {
            for (const rule of json.rules) {
                theme._rules.push(ThemeRule.from(theme, rule))
            }
        }
        return theme;
    }

    public clone(): Theme {
        return Theme.from(this.toJson());
    }

    public toJson(): any {
        return {
            readonly: this.readonly,
            name: this._name,
            rules: this._rules.map(r => r.toJson())
        }
    }

    public downRule(rule: ThemeRule) {
        throw new Error('Method not implemented.');
    }

    public upRule(rule: ThemeRule) {
        throw new Error('Method not implemented.');
    }
}
