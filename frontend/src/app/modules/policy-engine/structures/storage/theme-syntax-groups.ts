import { GROUP_NAMES_MAPPING } from '../../themes/default-syntax-groups';

export class ThemeSyntaxGroup {
    private _id: string;
    private _color: string;

    private constructor() {
        this._id = '';
        this._color = '';
    }

    public get id(): string {
        return this._id;
    }

    public get color(): string {
        return this._color;
    }

    public set color(value: string) {
        this._color = value;
    }

    public get name(): string {
        return GROUP_NAMES_MAPPING[this._id] || '';
    }

    public static from(json: any): ThemeSyntaxGroup {
        const syntaxGroup = new ThemeSyntaxGroup();
        syntaxGroup._id = json.id;
        syntaxGroup._color = json.color;
        return syntaxGroup;
    }

    public toJson(): any {
        return {
            id: this._id,
            color: this._color,
        };
    }
}
