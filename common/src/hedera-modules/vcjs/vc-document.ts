import { Timestamp } from '@hiero-ledger/sdk';
import { Hashing } from '../hashing.js';
import { TimestampUtils } from '../timestamp-utils.js';
import { IVC, SignatureType } from '@guardian/interfaces';
import { Issuer } from './issuer.js';
import { VcSubject } from './vc-subject.js';
import { CommonDidDocument } from './did/index.js';

/**
 * VC document
 */
export class VcDocument {
    /**
     * Context
     */
    public static readonly CONTEXT = '@context';
    /**
     * First context entry
     */
    public static readonly FIRST_CONTEXT_ENTRY = 'https://www.w3.org/2018/credentials/v1';
    /**
     * BBS Signature context
     */
    public static readonly BBS_SIGNATURE_CONTEXT = 'https://w3id.org/security/bbs/v1';
    /**
     * ID
     */
    public static readonly ID = 'id';
    /**
     * Credential subject
     */
    public static readonly CREDENTIAL_SUBJECT = 'credentialSubject';
    /**
     * Type
     */
    public static readonly TYPE = 'type';
    /**
     * Verifiable credential
     */
    public static readonly VERIFIABLE_CREDENTIAL_TYPE = 'VerifiableCredential';
    /**
     * Issuer
     */
    public static readonly ISSUER = 'issuer';
    /**
     * Issuer date
     */
    public static readonly ISSUANCE_DATE = 'issuanceDate';
    /**
     * Credential status
     */
    public static readonly CREDENTIAL_STATUS = 'credentialStatus';
    /**
     * Proof
     */
    public static readonly PROOF = 'proof';
    /**
     * Evidence
     */
    public static readonly EVIDENCE = 'evidence';
    /**
     * ID
     * @protected
     */
    protected id: string;
    /**
     * Type
     * @protected
     */
    protected type: string[];
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
     * Subject
     * @protected
     */
    protected subject: VcSubject[];
    /**
     * Context
     * @protected
     */
    protected context: string[];
    /**
     * Proof
     * @protected
     */
    protected proof: any;
    /**
     * Evidences
     * @protected
     */
    protected evidences: any[];

    /**
     * Constructor
     */
    // tslint:disable-next-line:unified-signatures
    constructor()
    /**
     * Constructor
     * @param signatureType
     */
    // tslint:disable-next-line:unified-signatures
    constructor(signatureType: string)
    /**
     * Constructor
     * @param hasBBSSignature
     * @deprecated
     */
    // tslint:disable-next-line:unified-signatures
    constructor(hasBBSSignature: boolean)
    constructor(arg?: string | boolean) {
        const type = (arg === true || arg === SignatureType.BbsBlsSignature2020)
            ? SignatureType.BbsBlsSignature2020
            : SignatureType.Ed25519Signature2018;
        this.subject = [];
        this.context = type === SignatureType.BbsBlsSignature2020
            ? [VcDocument.FIRST_CONTEXT_ENTRY, VcDocument.BBS_SIGNATURE_CONTEXT]
            : [VcDocument.FIRST_CONTEXT_ENTRY];
        this.type = [VcDocument.VERIFIABLE_CREDENTIAL_TYPE];
        this.evidences = [];
    }

    /**
     * Get context
     */
    public getContext(): string[] {
        return this.context;
    }

    /**
     * Set ID
     * @param id
     */
    public setId(id: string): void {
        this.id = VcDocument.convertUUID(id);
    }

    /**
     * Get ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Get type
     */
    public getType(): string[] {
        return this.type;
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
     * Get issuance date
     */
    public getIssuanceDate(): Timestamp {
        return this.issuanceDate;
    }

    /**
     * Set issuance date
     * @param issuanceDate
     */
    public setIssuanceDate(issuanceDate: Timestamp): void {
        this.issuanceDate = issuanceDate;
    }

    /**
     * Add context
     * @param context
     */
    public addContext(context: string): void {
        if (context && this.context.indexOf(context) === -1) {
            this.context.push(context);
        }
    }

    /**
     * Add contexts
     * @param contexts
     */
    public addContexts(contexts: string | string[]): void {
        if (Array.isArray(contexts)) {
            for (const context of contexts) {
                this.addContext(context);
            }
        } else {
            this.addContext(contexts);
        }
    }

    /**
     * Add type
     * @param type
     */
    public addType(type: string): void {
        if (this.type.indexOf(type) === -1) {
            this.type.push(type);
        }
    }

    /**
     * Add evidence
     * @param evidence
     */
    public addEvidence(evidence: any): void {
        this.evidences.push(evidence);
    }

    /**
     * Get credential subject
     * @param index
     */
    public getCredentialSubject(index: number = 0): VcSubject {
        return this.subject[index];
    }

    /**
     * Get credential subject
     */
    public getCredentialSubjects(): VcSubject[] {
        return this.subject;
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
     * Get subject type
     */
    public getSubjectType(): string {
        return this.getCredentialSubject(0)?.getType();
    }

    /**
     * Get subject field value
     * @param path
     * @param subjectIndex
     */
    public getField<T>(path: string, subjectIndex: number = 0): T {
        return this.getCredentialSubject(subjectIndex)?.getField<T>(path);
    }

    /**
     * Length
     */
    public get length(): number {
        return this.subject.length;
    }

    /**
     * to JSON
     */
    public toJson(): string {
        return JSON.stringify(this.toJsonTree());
    }

    /**
     * From JSON
     * @param json
     */
    public static fromJson(json: string): VcDocument {
        let result: VcDocument;
        try {
            const root = JSON.parse(json);
            result = VcDocument.fromJsonTree(root);
        } catch (error) {
            throw new Error('Given JSON string is not a valid VcDocument ' + error.message);
        }
        return result;
    }

    /**
     * To JSON tree
     */
    public toJsonTree(): IVC {
        const rootObject: any = {};

        if (this.id) {
            rootObject[VcDocument.ID] = this.id;
        }
        if (this.type) {
            rootObject[VcDocument.TYPE] = this.type;
        }
        if (this.issuer) {
            rootObject[VcDocument.ISSUER] = this.issuer.toJsonTree();
        }
        if (this.issuanceDate) {
            rootObject[VcDocument.ISSUANCE_DATE] = TimestampUtils.toJSON(this.issuanceDate);
        }

        const context = [];
        if (this.context) {
            for (const element of this.context) {
                context.push(element);
            }
        }
        rootObject[VcDocument.CONTEXT] = context;

        const credentialSubject = [];
        if (this.subject) {
            for (const element of this.subject) {
                credentialSubject.push(element.toJsonTree());
            }
        }
        rootObject[VcDocument.CREDENTIAL_SUBJECT] = credentialSubject;

        if (this.evidences?.length) {
            rootObject[VcDocument.EVIDENCE] = JSON.parse(JSON.stringify(this.evidences));
        }

        if (this.proof) {
            rootObject[VcDocument.PROOF] = this.proof;
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
     * From JSON tree
     * @param json
     */
    public static fromJsonTree(json: IVC): VcDocument {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = new VcDocument(
            json['@context'].includes(VcDocument.BBS_SIGNATURE_CONTEXT)
        );

        if (json[VcDocument.CONTEXT]) {
            result.context = json[VcDocument.CONTEXT];
        }
        if (json[VcDocument.ID]) {
            result.id = VcDocument.convertUUID(json[VcDocument.ID]);
        }
        if (json[VcDocument.TYPE]) {
            result.type = json[VcDocument.TYPE];
        }
        if (json[VcDocument.ISSUER]) {
            result.issuer = Issuer.fromJsonTree(json[VcDocument.ISSUER]);
        }
        if (json[VcDocument.ISSUANCE_DATE]) {
            result.issuanceDate = TimestampUtils.fromJson(json[VcDocument.ISSUANCE_DATE]);
        }

        const jsonCredentialSubject = json[VcDocument.CREDENTIAL_SUBJECT];
        if (jsonCredentialSubject) {
            if (Array.isArray(jsonCredentialSubject)) {
                for (const item of jsonCredentialSubject) {
                    const subject = VcSubject.fromJsonTree(item);
                    result.addCredentialSubject(subject);
                }
            } else {
                const subject = VcSubject.fromJsonTree(jsonCredentialSubject);
                result.addCredentialSubject(subject);
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

        if (json[VcDocument.EVIDENCE]) {
            result.evidences = JSON.parse(JSON.stringify(json[VcDocument.EVIDENCE]));
            if (!Array.isArray(result.evidences)) {
                result.evidences = [result.evidences];
            }
        } else {
            result.evidences = []
        }

        if (json[VcDocument.PROOF]) {
            result.proof = json[VcDocument.PROOF];
        }

        return result;
    }

    /**
     * To credential hash
     */
    public toCredentialHash(): string {
        const map = {};
        map[VcDocument.ID] = this.id;
        map[VcDocument.TYPE] = this.type;
        map[VcDocument.ISSUER] = this.issuer.getId();
        map[VcDocument.ISSUANCE_DATE] = TimestampUtils.toJSON(this.issuanceDate);
        const json: string = JSON.stringify(map);
        const hash: Uint8Array = Hashing.sha256.digest(json);
        return Hashing.base58.encode(hash);
    }

    /**
     * Add credential subject
     * @param subject
     */
    public addCredentialSubject(subject: VcSubject): void {
        if (subject) {
            this.subject.push(subject);
        }
    }

    /**
     * Add credential subjects
     * @param subjects
     */
    public addCredentialSubjects(subjects: VcSubject[]): void {
        if (subjects) {
            for (const subject of subjects) {
                this.subject.push(subject);
            }
        }
    }

    /**
     * Get document
     */
    public getDocument(): IVC {
        return this.toJsonTree();
    }

    /**
     * Proof from JSON
     * @param json
     */
    public proofFromJson(json: any): void {
        this.setProof(json[VcDocument.PROOF]);
    }

    /**
     * To Static Object
     * @param f - clear function
     */
    public toStaticObject(f?: Function): any {
        const map = {};
        map[VcDocument.ISSUER] = this.issuer.getId();
        map[VcDocument.CREDENTIAL_SUBJECT] = [];
        for (const subject of this.subject) {
            map[VcDocument.CREDENTIAL_SUBJECT].push(subject.toStaticObject(f));
        }
        return map;
    }

    /**
     * To credential hash
     * @param docs
     * @param f - clear function
     */
    public static toCredentialHash(docs: VcDocument | VcDocument[], f?: (item: any) => any): string {
        if (docs) {
            let obj: any = null;
            if (Array.isArray(docs)) {
                obj = [];
                for (const doc of docs) {
                    obj.push(doc.toStaticObject(f));
                }
            } else {
                obj = docs.toStaticObject(f);
            }
            const json: string = JSON.stringify(obj);
            const hash: Uint8Array = Hashing.sha256.digest(json);
            return Hashing.base58.encode(hash);
        }
        return null
    }

    /**
     * Get document
     */
    public getSignatureType(): SignatureType {
        if (this.context.includes(VcDocument.BBS_SIGNATURE_CONTEXT)) {
            return SignatureType.BbsBlsSignature2020;
        } else {
            return SignatureType.Ed25519Signature2018;
        }
    }
}
