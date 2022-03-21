
export class Issuer {
    public static readonly ID = 'id';
    public static readonly NAME = 'name';

    protected id: string;
    protected name: string;

    constructor(id: string, name?: string) {
        this.id = id;
        this.name = name || null;
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public toJsonTree(): any {
        if (this.name) {
            const rootObject = {};
            rootObject[Issuer.ID] = this.id;
            rootObject[Issuer.NAME] = this.name;
            return rootObject;
        }
        return this.id;
    }

    public static fromJsonTree(root: any): Issuer {
        let id: string, name: string;
        if (typeof root == "string") {
            id = root;
        } else {
            id = root[Issuer.ID];
            name = root[Issuer.NAME];
        }
        return new Issuer(id, name);
    }

    public toJSON(): string {
        return JSON.stringify(this.toJsonTree());
    }

    public static fromJson(json: string): Issuer {
        try {
            const root = JSON.parse(json);
            return this.fromJsonTree(root);
        } catch (e) {
            throw new Error('Given JSON string is not a valid Issuer ' + e.message);
        }
    }
}
