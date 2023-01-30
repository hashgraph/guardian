/**
 * Issuer class
 */
export class Issuer {
    /**
     * ID
     */
    public static readonly ID = 'id';
    /**
     * GROUP
     */
    public static readonly GROUP = 'group';
    /**
     * ID
     * @protected
     */
    protected id: string;
    /**
     * Group
     * @protected
     */
    protected group: string;

    constructor(id: string, group?: string) {
        this.id = id;
        this.group = group || null;
    }

    /**
     * Get ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Get group
     */
    public getGroup(): string {
        return this.group;
    }

    /**
     * To JSON tree
     */
    public toJsonTree(): any {
        if (this.group) {
            const rootObject = {};
            rootObject[Issuer.ID] = this.id;
            rootObject[Issuer.GROUP] = this.group;
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
        let group: string;
        if (typeof root === 'string') {
            id = root;
        } else {
            id = root[Issuer.ID];
            group = root[Issuer.GROUP];
        }
        return new Issuer(id, group);
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
