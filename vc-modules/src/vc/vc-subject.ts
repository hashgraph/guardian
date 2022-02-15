import { CredentialSubject, HcsVcDocumentJsonProperties } from '@hashgraph/did-sdk-js';

/**
 * A verifiable credential contains claims about one or more subjects. 
 * VcSubject defines a property for the expression of claims about one or more subjects.
 */
export class VcSubject extends CredentialSubject {
    public static readonly CREDENTIAL_TYPE: string = 'type';
    public static readonly CREDENTIAL_ID: string = 'id';

    private context: string[];
    private fields: any;
    private readonly type: string;

    public getType(): string {
        return this.type;
    }

    public getField<T>(name: string): T {
        return this.fields[name];
    }

    constructor(schema: string, subject: any) {
        super();
        this.context = [];
        
        this.id = subject[VcSubject.CREDENTIAL_ID];
        this.type = subject[VcSubject.CREDENTIAL_TYPE] || schema;

        const context = subject[HcsVcDocumentJsonProperties.CONTEXT];
        this.addContext(context);

        this.fields = {};
        const keys = Object.keys(subject);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key != VcSubject.CREDENTIAL_ID &&
                key != VcSubject.CREDENTIAL_TYPE &&
                key != HcsVcDocumentJsonProperties.CONTEXT
            ) {
                this.fields[key] = subject[key];
            }
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

    public toJsonTree(): any {
        const json = {}
        if (this.context && this.context.length) {
            json[HcsVcDocumentJsonProperties.CONTEXT] = this.context.slice();
        }
        if (this.id) {
            json[VcSubject.CREDENTIAL_ID] = this.id;
        }
        if (this.type) {
            json[VcSubject.CREDENTIAL_TYPE] = this.type;
        }
        const keys = Object.keys(this.fields);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            json[key] = this.fields[key];
        }

        return json;
    }

    public toJson(): any {
        return JSON.stringify(this.toJsonTree());
    }

    public static fromJsonTree(json: any): VcSubject {
        const id = json[VcSubject.CREDENTIAL_ID];
        const type = json[VcSubject.CREDENTIAL_TYPE];

        const result: VcSubject = new VcSubject(type, json);
        const context = json[HcsVcDocumentJsonProperties.CONTEXT];
        if (context && context.length) {
            for (let i = 0; i < context.length; i++) {
                result.addContext(context[i]);

            }
        }
        return result;
    }

    public static fromJson(json: string): VcSubject {
        const root = JSON.parse(json);
        return this.fromJsonTree(root);
    }

    public static toJsonTree(item: VcSubject): any {
        return item ? item.toJsonTree() : null;
    }

    public static toJson(item: VcSubject): any {
        return JSON.stringify(this.toJsonTree(item));
    }
}
