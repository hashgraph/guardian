import { ICredentialSubject } from '@guardian/interfaces';

/**
 * VC subject
 */
export class VcSubject {
    /**
     * Credential ID
     */
    public static readonly CREDENTIAL_ID: string = 'id';
    /**
     * Credential type
     */
    public static readonly CREDENTIAL_TYPE: string = 'type';
    /**
     * Context
     */
    public static readonly CONTEXT: string = '@context';

    /**
     * ID
     * @protected
     */
    protected id: string;
    /**
     * Context
     * @protected
     */
    protected context: string[];
    /**
     * Type
     * @protected
     */
    protected type: string;
    /**
     * Document
     * @protected
     */
    protected document: any;

    constructor() {
        this.context = [];
    }

    /**
     * Get ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Set ID
     * @param id
     */
    public setId(id: string): void {
        this.id = id;
    }

    /**
     * Get type
     */
    public getType(): string {
        return this.type;
    }

    /**
     * Get field
     * @param name
     */
    public getField<T>(name: string): T {
        try {
            const f = name.split('.');
            let result = this.document;
            for (const it of f) {
                result = result[it];
            }
            return result;
        } catch (error) {
            return null;
        }
    }

    /**
     * Adds an additional context to @context field of the Credential Subject.
     *
     * @param context The context to add.
     */
    public addContext(context: string | string[]): void {
        if (context) {
            if (Array.isArray(context)) {
                for (const element of context) {
                    this._addContext(element);
                }
            } else {
                this._addContext(context);
            }
        }
    }

    /**
     * Add context
     * @param context
     * @private
     */
    private _addContext(context: string): void {
        if (this.context.indexOf(context) === -1) {
            this.context.push(context)
        }
    }

    /**
     * To JSON
     */
    public toJson(): string {
        return JSON.stringify(this.toJsonTree());
    }

    /**
     * To JSON tree
     */
    public toJsonTree(): ICredentialSubject {
        const json = Object.assign({}, this.document);

        if (this.context && this.context.length) {
            json[VcSubject.CONTEXT] = this.context.slice();
        }
        if (this.id) {
            json[VcSubject.CREDENTIAL_ID] = this.id;
        }
        if (this.type) {
            json[VcSubject.CREDENTIAL_TYPE] = this.type;
        }

        return json;
    }

    /**
     * Get fields
     */
    public getFields(): any {
        return Object.assign({}, this.document);
    }

    /**
     * From JSON
     * @param json
     */
    public static fromJson(json: string): VcSubject {
        let result: VcSubject;
        try {
            const root = JSON.parse(json);
            result = VcSubject.fromJsonTree(root);
        } catch (error) {
            throw new Error('Given JSON string is not a valid VcSubject ' + error.message);
        }
        return result;
    }

    /**
     * From JSON tree
     * @param json
     */
    public static fromJsonTree(json: ICredentialSubject): VcSubject {
        return VcSubject.create(json);
    }

    /**
     * Create
     * @param subject
     */
    public static create(subject: any): VcSubject {
        if (!subject) {
            throw new Error('Subject is empty');
        }

        const result = new VcSubject();

        result.id = subject[VcSubject.CREDENTIAL_ID];
        result.type = subject[VcSubject.CREDENTIAL_TYPE];
        const context = subject[VcSubject.CONTEXT];
        result.addContext(context);

        const newSubject = Object.assign({}, subject);
        delete newSubject[VcSubject.CREDENTIAL_ID];
        delete newSubject[VcSubject.CREDENTIAL_TYPE];
        delete newSubject[VcSubject.CONTEXT];

        result.document = newSubject;

        return result;
    }
}
