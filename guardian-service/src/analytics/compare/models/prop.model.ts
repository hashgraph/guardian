import { IProperties } from "../interfaces/properties.interface";

export class PropModel {
    private prop: any;
    private permissions: string[];

    constructor(json: any) {
        if (Array.isArray(json.permissions)) {
            this.permissions = json.permissions;
        } else {
            this.permissions = [];
        }
        this.permissions.sort();
        this.prop = Object.assign({}, json, {
            id: undefined,
            permissions: undefined,
            artifacts: undefined,
            events: undefined,
            children: undefined,
            tokenId: undefined,
            schema: undefined,
            presetSchema: undefined,
            inputSchema: undefined,
            outputSchema: undefined,
        });
    }

    public getPermissions(lvl: number): string {
        return JSON.stringify(this.permissions);
    }

    public toString(lvl: number): string {
        if (lvl == 1) {
            const p = {};
            const keys = Object.keys(this.prop);
            for (const key of keys) {
                if (typeof this.prop[key] !== 'object') {
                    p[key] = this.prop[key];
                }
            }
            return JSON.stringify(p);
        } else {
            return JSON.stringify(this.prop);
        }
    }

    public get<T>(key: string): T {
        return this.prop[key];
    }

    public keys(): string[] {
        return Object.keys(this.prop);
    }

    public static keys(...arg: PropModel[]): string[] {
        const result: any = {};
        for (const p of arg) {
            const keys = Object.keys(p.prop);
            for (const key of keys) {
                result[key] = true;
            }
        }
        return Object.keys(result);
    }

    private _getPropList(
        name: string,
        value: any,
        properties: IProperties<any>[],
        lvl: number,
        path: string
    ): IProperties<any>[] {
        if (!value) {
            return properties;
        }
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                properties.push({ type: 'array', name, lvl, path, value: !!value.length });
                if (value.length) {
                    for (let index = 0; index < value.length; index++) {
                        const v = value[index];
                        this._getPropList(String(index), v, properties, lvl + 1, `${path}.${index}`);
                    }
                }
            } else {
                const keys = Object.keys(value);
                properties.push({ type: 'object', name, lvl, path, value: !!keys.length });
                for (const key of keys) {
                    this._getPropList(key, value[key], properties, lvl + 1, `${path}.${key}`);
                }
            }
        } else {
            properties.push({ type: 'property', name, value, lvl, path });
        }
        return properties;
    }

    public getPropList(): IProperties<any>[] {
        const properties: IProperties<any>[] = [];
        const keys = Object.keys(this.prop);
        for (const key of keys) {
            if (key !== 'blockType' && key !== 'tag') {
                this._getPropList(key, this.prop[key], properties, 1, key);
            }
        }
        return properties;
    }

    public getPermissionsList(): string[] {
        return this.permissions;
    }
}
