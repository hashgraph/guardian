/**
 * Issuer class
 */
export class Issuer {
    /**
     * ID
     */
    public static readonly ID = 'id';
    /**
     * NAME
     */
    public static readonly NAME = 'name';
    /**
     * ID
     * @protected
     */
    protected id: string;
    /**
     * Name
     * @protected
     */
    protected name: string;

    constructor(id: string, name?: string) {
        this.id = id;
        this.name = name || null;
    }

    /**
     * Get ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Get name
     */
    public getName(): string {
        return this.name;
    }

    /**
     * To JSON tree
     */
    public toJsonTree(): any {
        if (this.name) {
            const rootObject = {};
            rootObject[Issuer.ID] = this.id;
            rootObject[Issuer.NAME] = this.name;
            return rootObject;
        }
        return this.id;
    }

    /**
     * From JSON tree
     * @param root
     */
    public static fromJsonTree(root: any): Issuer {
        if (!root) {
            throw new Error('JSON Object is empty');
        }

        let id: string;
        let name: string;
        if (typeof root === 'string') {
            id = root;
        } else {
            id = root[Issuer.ID];
            name = root[Issuer.NAME];
        }
        return new Issuer(id, name);
    }

    /**
     * To JSON
     */
    public toJSON(): string {
        return JSON.stringify(this.toJsonTree());
    }

    /**
     * From JSON
     * @param json
     */
    public static fromJson(json: string): Issuer {
        try {
            const root = JSON.parse(json);
            return Issuer.fromJsonTree(root);
        } catch (error) {
            throw new Error('Given JSON string is not a valid Issuer ' + error.message);
        }
    }
}
