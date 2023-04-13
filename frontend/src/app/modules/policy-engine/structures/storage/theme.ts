import { PolicyBlockModel } from '..';
import { ThemeRole } from './theme-role';

export class Theme {
    public readonly: boolean;

    private _name: string;
    private _roles: ThemeRole[];

    constructor() {
        this.readonly = false;
        this._name = '';
        this._roles = [];
    }

    public get name(): string {
        return this._name;
    }

    public set name(v: string) {
        this._name = v;
    }

    public get roles(): ThemeRole[] {
        return this._roles;
    }

    public update(): void {
    }

    public addRole(): ThemeRole {
        const role = new ThemeRole(this);
        this._roles.push(role);
        return role;
    }

    public deleteRole(role: ThemeRole): void {
        this._roles = this._roles.filter(r => r != role);
    }

    public getStyle(item: PolicyBlockModel): any {
        for (const role of this._roles) {
            if (role.check(item)) {
                return role.style;
            }
        }
        return null;
    }

    public getStyleByIndex(index: number): any {
        return this._roles[index]?.style;
    }

    public static from(json: any): Theme {
        const theme = new Theme();
        theme._name = json.name || '';
        if (Array.isArray(json.roles)) {
            for (const role of json.roles) {
                theme._roles.push(ThemeRole.from(theme, role))
            }
        }
        return theme;
    }

    public clone(): Theme {
        return Theme.from(this.toJson());
    }

    public toJson(): any {
        return {
            name: this._name,
            roles: this._roles.map(r => r.toJson())
        }
    }
}
