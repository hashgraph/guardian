export class BooleanProperty {
    public readonly name: string;
    public readonly defaultValue: boolean;

    private _value: boolean;

    constructor(name: string, defaultValue: boolean = false) {
        this.name = name;
        this.defaultValue = defaultValue;
        this._value = defaultValue;
    }

    public load(): boolean {
        try {
            const value = localStorage.getItem(this.name);
            if (value === 'true') {
                this._value = true;
            } else if (value === 'false') {
                this._value = false;
            } else {
                this._value = this.defaultValue;
            }
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

    public get value(): boolean {
        return this._value;
    }

    public set value(value: boolean) {
        this._value = value;
    }
}
