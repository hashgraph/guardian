import { CredentialSubject, Hashing, HcsVcDocumentBase, HcsVcDocumentJsonProperties, JsonClass } from 'did-sdk-js';
import { HcsVcDocument, VcSubject } from '..';

const VERIFIABLE_CREDENTIAL = 'verifiableCredential';

/**
 * The base for a VP document generation in JSON-LD format.
 * VP documents according to W3C draft specification must be compatible with JSON-LD version 1.1 Up until now there is
 */
export class HcsVpDocument {
    protected id: string;
    protected cid: string;
    protected context: string[];
    protected type: string[];
    protected verifiableCredential: HcsVcDocument<VcSubject>[];
    protected proof: any;

    constructor() {
        this.type = ['VerifiablePresentation'];
        this.context = ['https://www.w3.org/2018/credentials/v1'];
    }

    public getId(): string {
        return this.id;
    }

    public setId(id: string): void {
        this.id = id;
    }

    public getCid(): string {
        return this.cid;
    }

    public setCid(cid: string): void {
        this.cid = cid;
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

    public addVerifiableCredential(verifiableCredential: HcsVcDocument<VcSubject> | HcsVcDocument<VcSubject>[]): void {
        if (this.verifiableCredential == null) {
            this.verifiableCredential = [];
        }
        if (Array.isArray(verifiableCredential)) {
            this.verifiableCredential = this.verifiableCredential.concat(verifiableCredential);
        } else {
            this.verifiableCredential.push(verifiableCredential);
        }
    }

    public getVerifiableCredential(): HcsVcDocument<VcSubject>[] {
        return this.verifiableCredential;
    }

    public proofFromJson(json: any): void {
        this.setProof(json[HcsVcDocumentJsonProperties.PROOF]);
    }

    public toCredentialHash(): string {
        const map = {};
        map[HcsVcDocumentJsonProperties.ID] = this.id;
        map[HcsVcDocumentJsonProperties.TYPE] = this.type;
        if (this.verifiableCredential) {
            map[VERIFIABLE_CREDENTIAL] = this.verifiableCredential.map(e => e.toCredentialHash());
        }
        const json: string = JSON.stringify(map);
        const hash: Uint8Array = Hashing.sha256.digest(json);
        return Hashing.base58.encode(hash);
    }

    public toJsonTree(): any {
        const rootObject = {};
        if (this.id)
            rootObject[HcsVcDocumentJsonProperties.ID] = this.id;
        if (this.type)
            rootObject[HcsVcDocumentJsonProperties.TYPE] = this.type;

        const context = [];
        if (this.context) {
            for (let index = 0; index < this.context.length; index++) {
                const element = this.context[index];
                context.push(element);
            }
        }
        rootObject[HcsVcDocumentJsonProperties.CONTEXT] = context;

        const verifiableCredential = [];
        if (this.verifiableCredential) {
            for (let index = 0; index < this.verifiableCredential.length; index++) {
                const element = this.verifiableCredential[index];
                verifiableCredential.push(element.toJsonTree());
            }
        }
        rootObject[VERIFIABLE_CREDENTIAL] = verifiableCredential;

        if (this.proof) {
            rootObject[HcsVcDocumentJsonProperties.PROOF] = this.proof;
        }

        return rootObject;
    }

    public toJSON(): string {
        return JSON.stringify(this.toJsonTree());
    }

    public static fromJsonTree(root: any, result?: HcsVpDocument): HcsVpDocument {
        if (!result)
            result = new HcsVpDocument();
        if (root[HcsVcDocumentJsonProperties.ID])
            result.id = root[HcsVcDocumentJsonProperties.ID];
        if (root[HcsVcDocumentJsonProperties.TYPE])
            result.type = root[HcsVcDocumentJsonProperties.TYPE];

        const jsonVerifiableCredential = root[VERIFIABLE_CREDENTIAL] as any[];
        const verifiableCredential: HcsVcDocument<VcSubject>[] = [];
        for (let i = 0; i < jsonVerifiableCredential.length; i++) {
            const item = jsonVerifiableCredential[i];
            const vc = HcsVcDocument.fromJsonTree<VcSubject>(item, null, VcSubject);
            verifiableCredential.push(vc)
        }
        result.verifiableCredential = verifiableCredential;
        result.proof = root[HcsVcDocumentJsonProperties.PROOF] || null;

        return result;
    }

    public static fromJson(json: string): HcsVpDocument {
        let result: HcsVpDocument;
        try {
            const root = JSON.parse(json);
            result = this.fromJsonTree(root);

        } catch (e) {
            throw new Error('Given JSON string is not a valid VpDocument ' + e.message);
        }
        return result;
    }
}
