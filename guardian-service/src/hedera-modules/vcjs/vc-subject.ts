import { ICredentialSubject } from "interfaces";

export class VcSubject {
    public static readonly CREDENTIAL_ID: string = 'id';
    public static readonly CREDENTIAL_TYPE: string = 'type';
    public static readonly CONTEXT: string = "@context";

    protected id: string;
    protected context: string[];
    protected type: string;
    protected document: any;

    constructor() {
        this.context = [];
    }

    public getId(): string {
        return this.id;
    }

    public setId(id: string): void {
        this.id = id;
    }

    public getType(): string {
        return this.type;
    }

    public getField<T>(name: string): T {
        try {
            const f = name.split('.');
            let result = this.document;
            for (let i = 0; i < f.length; i++) {
                result = result[f[i]];
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
                for (let index = 0; index < context.length; index++) {
                    const element = context[index];
                    this._addContext(element);
                }
            } else {
                this._addContext(context);
            }
        }
    }

    private _addContext(context: string): void {
        if (this.context.indexOf(context) == -1) {
            this.context.push(context)
        }
    }

    public toJson(): string {
        return JSON.stringify(this.toJsonTree());
    }

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

    public static fromJson(json: string): VcSubject {
        let result: VcSubject;
        try {
            const root = JSON.parse(json);
            result = VcSubject.fromJsonTree(root);
        } catch (e) {
            throw new Error('Given JSON string is not a valid VcSubject ' + e.message);
        }
        return result;
    }

    public static fromJsonTree(json: ICredentialSubject): VcSubject {
        return this.create(json);
    }

    public static create(subject: any, schema?: string): VcSubject {
        if (!subject) {
            throw new Error('Subject is empty');
        }

        const result = new VcSubject();

        result.id = subject[VcSubject.CREDENTIAL_ID];
        result.type = subject[VcSubject.CREDENTIAL_TYPE] || schema;
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