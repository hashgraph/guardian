import { Hashing } from "./../hashing";
import { IVP } from "interfaces";
import { VcDocument } from "./vc-document";

export class VpDocument {
    public static readonly FIRST_CONTEXT_ENTRY = 'https://www.w3.org/2018/credentials/v1';
    public static readonly VERIFIABLE_PRESENTATION_TYPE = 'VerifiablePresentation';
    public static readonly VERIFIABLE_CREDENTIAL = 'verifiableCredential';
    public static readonly CONTEXT = '@context';
    public static readonly ID = 'id';
    public static readonly TYPE = 'type';
    public static readonly PROOF = 'proof';

    protected id: string;
    protected context: string[];
    protected type: string[];
    protected credentials: VcDocument[];
    protected proof: any;

    constructor() {
        this.credentials = [];
        this.type = [VpDocument.VERIFIABLE_PRESENTATION_TYPE];
        this.context = [VpDocument.FIRST_CONTEXT_ENTRY];
    }

    public getId(): string {
        return this.id;
    }

    public setId(id: string): void {
        this.id = id;
    }

    public getContext(): string[] {
        return this.context;
    }

    public addContext(context: string): void {
        this.context.push(context);
    }

    public getType(): string[] {
        return this.type;
    }

    public addType(type: string): void {
        this.type.push(type);
    }

    public getProof(): any {
        return this.proof;
    }

    public setProof(proof: any): void {
        this.proof = proof;
    }

    public getVerifiableCredential(index: number = 0): VcDocument {
        return this.credentials[index];
    }

    public getVerifiableCredentials(): VcDocument[] {
        return this.credentials;
    }

    public get length(): number {
        return this.credentials.length;
    }

    public addVerifiableCredential(vc: VcDocument): void {
        if (vc) {
            this.credentials.push(vc);
        }
    }

    public addVerifiableCredentials(vcs: VcDocument[]): void {
        if (vcs) {
            for (let index = 0; index < vcs.length; index++) {
                this.credentials.push(vcs[index]);
            }
        }
    }

    public toJson(): string {
        return JSON.stringify(this.toJsonTree());
    }

    public toJsonTree(): IVP {
        const rootObject: any = {};
        if (this.id)
            rootObject[VpDocument.ID] = this.id;
        if (this.type)
            rootObject[VpDocument.TYPE] = this.type;

        const context = [];
        if (this.context) {
            for (let index = 0; index < this.context.length; index++) {
                const element = this.context[index];
                context.push(element);
            }
        }
        rootObject[VpDocument.CONTEXT] = context;

        const verifiableCredential = [];
        if (this.credentials) {
            for (let index = 0; index < this.credentials.length; index++) {
                const element = this.credentials[index];
                verifiableCredential.push(element.toJsonTree());
            }
        }
        rootObject[VpDocument.VERIFIABLE_CREDENTIAL] = verifiableCredential;

        if (this.proof) {
            rootObject[VpDocument.PROOF] = this.proof;
        }

        return rootObject;
    }

    public static fromJson(json: string): VpDocument {
        let result: VpDocument;
        try {
            const root = JSON.parse(json);
            result = this.fromJsonTree(root);

        } catch (e) {
            throw new Error('Given JSON string is not a valid VpDocument ' + e.message);
        }
        return result;
    }

    public static fromJsonTree(json: IVP): VpDocument {
        const result = new VpDocument();
        if (json[VpDocument.ID])
            result.id = json[VpDocument.ID];
        if (json[VpDocument.TYPE])
            result.type = json[VpDocument.TYPE];

        const jsonVerifiableCredential = json[VpDocument.VERIFIABLE_CREDENTIAL];
        if (jsonVerifiableCredential) {
            if (Array.isArray(jsonVerifiableCredential)) {
                for (let i = 0; i < jsonVerifiableCredential.length; i++) {
                    const item = jsonVerifiableCredential[i];
                    const credential = VcDocument.fromJsonTree(item);
                    result.addVerifiableCredential(credential);
                }
            } else {
                const credential = VcDocument.fromJsonTree(jsonVerifiableCredential);
                result.addVerifiableCredential(credential);
            }
        }
        const context = json[VcDocument.CONTEXT];
        if (context) {
            if (Array.isArray(context)) {
                for (let i = 0; i < context.length; i++) {
                    const item = context[i];
                    result.addContext(item);
                }
            } else {
                result.addContext(context);
            }

            result.context = context.slice();
        }

        result.proof = json[VpDocument.PROOF] || null;

        return result;
    }

    public toCredentialHash(): string {
        const map = {};
        map[VpDocument.ID] = this.id;
        map[VpDocument.TYPE] = this.type;
        if (this.credentials) {
            map[VpDocument.VERIFIABLE_CREDENTIAL] = this.credentials.map(e => e.toCredentialHash());
        }
        const json: string = JSON.stringify(map);
        const hash: Uint8Array = Hashing.sha256.digest(json);
        return Hashing.base58.encode(hash);
    }

    public proofFromJson(json: any): void {
        this.setProof(json[VpDocument.PROOF]);
    }

    
    public getDocument(): IVP {
        return this.toJsonTree();
    }
}