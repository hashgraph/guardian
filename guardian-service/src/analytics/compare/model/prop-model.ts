
export class PropModel {
    private prop: any;

    constructor(json: any) {
        this.prop = Object.assign({}, json, {
            id: undefined,
            permissions: undefined,
            events: undefined,
            children: undefined,
            schema: undefined,
            presetSchema: undefined,
            tokenId: undefined
        });
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
}
