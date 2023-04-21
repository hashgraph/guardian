export class ArrayProperty<T> {
    public readonly name: string;
    public readonly defaultValue: T[];

    private _value: T[];

    constructor(name: string, defaultValue: T[] = []) {
        this.name = name;
        this.defaultValue = defaultValue?.slice() || [];
        this._value = this.defaultValue.slice();
    }

    public load(): T[] {
        try {
            const json = localStorage.getItem(this.name);
            if (typeof json === 'string' && json.startsWith('[')) {
                const value = JSON.parse(json);
                if (Array.isArray(value)) {
                    this._value = value;
                    return this._value;
                }
            }
            this._value = this.defaultValue.slice();
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

    public delete(item: T): T[] {
        this._value = this._value.filter(t => t !== item);
        return this._value;
    }


    public add(item: T): T[] {
        this._value.push(item);
        return this._value;
    }
}