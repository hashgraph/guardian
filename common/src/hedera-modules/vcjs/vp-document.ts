import { Hashing } from '../hashing.js';
import { IVP } from '@guardian/interfaces';
import { VcDocument } from './vc-document.js';
import { Issuer } from './issuer.js';
import { TimestampUtils } from '../timestamp-utils.js';
import { Timestamp } from '@hiero-ledger/sdk';
import { CommonDidDocument } from './did/index.js';

/**
 * VP document
 */
export class VpDocument {
    /**
     * First context entry
     */
    public static readonly FIRST_CONTEXT_ENTRY = 'https://www.w3.org/2018/credentials/v1';
    /**
     * VP type
     */
    public static readonly VERIFIABLE_PRESENTATION_TYPE = 'VerifiablePresentation';
    /**
     * VC
     */
    public static readonly VERIFIABLE_CREDENTIAL = 'verifiableCredential';
    /**
     * Context
     */
    public static readonly CONTEXT = '@context';
    /**
     * ID
     */
    public static readonly ID = 'id';
    /**
     * Type
     */
    public static readonly TYPE = 'type';
    /**
     * Proof
     */
    public static readonly PROOF = 'proof';
    /**
     * Issuer
     */
    public static readonly ISSUER = 'issuer';
    /**
     * Issuance date
     */
    public static readonly ISSUANCE_DATE = 'issuanceDate';
    /**
     * Tags
     */
    public static readonly TAGS = 'tags';

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
    protected type: string[];
    /**
     * Credentials
     * @protected
     */
    protected credentials: VcDocument[];
    /**
     * Proof
     * @protected
     */
    protected proof: any;
    /**
     * Issuer
     * @protected
     */
    protected issuer: Issuer;
    /**
     * Issuance date
     * @protected
     */
    protected issuanceDate: Timestamp;
    /**
     * Tags
     * @protected
     */
    protected tags: any[];

    constructor() {
        this.credentials = [];
        this.type = [VpDocument.VERIFIABLE_PRESENTATION_TYPE];
        this.context = [VpDocument.FIRST_CONTEXT_ENTRY];
    }

    /**
     * Get id
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Set ID
     * @param id
     */
    public setId(id: string): void {
        this.id = VpDocument.convertUUID(id);
    }

    /**
     * Get issuer
     */
    public getIssuer(): Issuer {
        return this.issuer;
    }

    /**
     * Get issuer DID
     */
    public getIssuerDid(): string {
        if (this.issuer) {
            return this.issuer.getId();
        }
        return null;
    }

    /**
     * Set issuer
     * @param issuer
     */
    public setIssuer(issuer: string | Issuer | CommonDidDocument): void {
        if (typeof issuer === 'string') {
            this.issuer = new Issuer(issuer);
        } else if (issuer instanceof Issuer) {
            this.issuer = issuer;
        } else if (typeof issuer.getDid === 'function') {
            this.issuer = new Issuer(issuer.getDid());
        }
    }

    /**
     * Get context
     */
    public getContext(): string[] {
        return this.context;
    }

    /**
     * Add context
     * @param context
     */
    public addContext(context: string): void {
        this.context.push(context);
    }

    /**
     * Get type
     */
    public getType(): string[] {
        return this.type;
    }

    /**
     * Add type
     * @param type
     */
    public addType(type: string): void {
        this.type.push(type);
    }

    /**
     * Get proof
     */
    public getProof(): any {
        return this.proof;
    }

    /**
     * Set proof
     * @param proof
     */
    public setProof(proof: any): void {
        this.proof = proof;
    }

    /**
     * Get tags
     */
    public getTags(): any[] {
        return this.tags;
    }

    /**
     * Set tags
     * @param tags
     */
    public setTags(tags: any): void {
        this.tags = tags;
    }

    /**
     * Add tags
     * @param tags
     */
    public addTags(tags: any): void {
        if (!tags || tags.length <= 0) {
            return;
        }
        this.tags = this.tags || [];
        for (const tag of tags) {
            if (!tag.inheritTags) {
                continue;
            }
            if (this.tags.some(item => item.messageId === tag.messageId)) {
                continue;
            }
            this.tags.push(tag);
        }
    }

    /**
     * Get verifiable credential
     * @param index
     */
    public getVerifiableCredential(index: number = 0): VcDocument {
        return this.credentials[index];
    }

    /**
     * Get verifiable credentoals
     */
    public getVerifiableCredentials(): VcDocument[] {
        return this.credentials;
    }

    /**
     * Length
     */
    public get length(): number {
        return this.credentials.length;
    }

    /**
     * Add verifiable credential
     * @param vc
     */
    public addVerifiableCredential(vc: VcDocument): void {
        if (vc) {
            this.credentials.push(vc);
        }
    }

    /**
     * Add verifiable credentials
     * @param vcs
     */
    public addVerifiableCredentials(vcs: VcDocument[]): void {
        if (vcs) {
            for (const vc of vcs) {
                this.addVerifiableCredential(vc);
            }
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
    public toJsonTree(): IVP {
        const rootObject: any = {};
        if (this.id) {
            rootObject[VpDocument.ID] = this.id;
        }
        if (this.type) {
            rootObject[VpDocument.TYPE] = this.type;
        }
        if (this.issuer) {
            rootObject[VpDocument.ISSUER] = this.issuer.toJsonTree();
        }
        if (this.issuanceDate) {
            rootObject[VpDocument.ISSUANCE_DATE] = TimestampUtils.toJSON(this.issuanceDate);
        }

        const context = [];
        if (this.context) {
            for (const element of this.context) {
                context.push(element);
            }
        }
        rootObject[VpDocument.CONTEXT] = context;

        const verifiableCredential = [];
        if (this.credentials) {
            for (const element of this.credentials) {
                verifiableCredential.push(element.toJsonTree());
            }
        }
        rootObject[VpDocument.VERIFIABLE_CREDENTIAL] = verifiableCredential;

        if (this.proof) {
            rootObject[VpDocument.PROOF] = this.proof;
        }

        if (this.tags) {
            rootObject[VpDocument.TAGS] = this.tags;
        }

        return rootObject;
    }

    /**
     * Convert UUID
     * @param uuid
     */
    private static convertUUID(uuid: string): string {
        if (uuid && uuid.indexOf(':') === -1) {
            return `urn:uuid:${uuid}`;
        }
        return uuid;
    }

    /**
     * From JSON
     * @param json
     */
    public static fromJson(json: string): VpDocument {
        let result: VpDocument;
        try {
            const root = JSON.parse(json);
            result = VpDocument.fromJsonTree(root);

        } catch (error) {
            throw new Error('Given JSON string is not a valid VpDocument ' + error.message);
        }
        return result;
    }

    /**
     * From JSON tree
     * @param json
     */
    public static fromJsonTree(json: IVP): VpDocument {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = new VpDocument();
        if (json[VpDocument.ID]) {
            result.id = VpDocument.convertUUID(json[VpDocument.ID]);
        }
        if (json[VpDocument.TYPE]) {
            result.type = json[VpDocument.TYPE];
        }
        if (json[VpDocument.ISSUER]) {
            result.issuer = Issuer.fromJsonTree(json[VcDocument.ISSUER]);
        }
        if (json[VpDocument.ISSUANCE_DATE]) {
            result.issuanceDate = TimestampUtils.fromJson(json[VcDocument.ISSUANCE_DATE]);
        }

        const jsonVerifiableCredential = json[VpDocument.VERIFIABLE_CREDENTIAL];
        if (jsonVerifiableCredential) {
            if (Array.isArray(jsonVerifiableCredential)) {
                for (const item of jsonVerifiableCredential) {
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
                for (const item of context) {
                    result.addContext(item);
                }
            } else {
                result.addContext(context);
            }

            result.context = context.slice();
        }

        result.proof = json[VpDocument.PROOF] || null;

        result.tags = json[VpDocument.TAGS] || null;

        return result;
    }

    /**
     * To credential hash
     */
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

    /**
     * Proof from JSON
     * @param json
     */
    public proofFromJson(json: any): void {
        this.setProof(json[VpDocument.PROOF]);
    }

    /**
     * Get document
     */
    public getDocument(): IVP {
        return this.toJsonTree();
    }
}
