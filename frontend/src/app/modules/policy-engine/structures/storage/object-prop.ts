
export class ObjectProperty<T> {
    public readonly name: string;
    public readonly defaultValue: { [x: string]: T };

    private _value: { [x: string]: T };

    constructor(name: string, defaultValue: { [x: string]: T } = {}) {
        this.name = name;
        this.defaultValue = { ...defaultValue };
        this._value = { ...this.defaultValue };
    }

    public load(): { [x: string]: T } {
        try {
            const json = localStorage.getItem(this.name);
            if (typeof json === 'string' && json.startsWith('{')) {
                const value = JSON.parse(json);
                if (typeof value === 'object') {
                    this._value = Object.assign({}, this.defaultValue, value);
                    return this._value;
                }
            }
            this._value = { ...this.defaultValue };
        } catch (error) {
            console.error(error);
        }
        return this._value;
    }

    public save(): void {
        try {
            localStorage.setItem(this.name, JSON.stringify(this._value));
        } catch (error) {
            console.error(error);
        }
    }

    public get(key: string): T {
        return this._value[key];
    }

    public set(key: string, value: any): void {
        this._value[key] = value;
    }

    public delete(key: string): void {
        delete this._value[key];
    }
}
