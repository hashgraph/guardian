
export class StringProperty {
    public readonly name: string;
    public readonly defaultValue: string;

    private _value: string;

    constructor(name: string, defaultValue: string = '') {
        this.name = name;
        this.defaultValue = defaultValue;
        this._value = defaultValue;
    }

    public load(): string {
        try {
            this._value = localStorage.getItem(this.name) || '';
        } catch (error) {
            console.error(error);
            this._value = this.defaultValue;
        }
        return this._value;
    }

    public save(): void {
        try {
            localStorage.setItem(this.name, String(this._value));
        } catch (error) {
            console.error(error);
        }
    }

    public get value(): string {
        return this._value;
    }

    public set value(value: string) {
        this._value = value;
    }
}
