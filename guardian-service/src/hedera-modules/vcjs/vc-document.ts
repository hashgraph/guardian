import { Timestamp } from "@hashgraph/sdk";
import { Hashing } from "./../hashing";
import { TimestampUtils } from "./../timestamp-utils";
import { IVC } from "interfaces";
import { DIDDocument } from "./did-document";
import { Issuer } from "./issuer";
import { VcSubject } from "./vc-subject";

export class VcDocument {
    public static readonly CONTEXT = '@context';
    public static readonly FIRST_CONTEXT_ENTRY = 'https://www.w3.org/2018/credentials/v1';
    public static readonly ID = 'id';
    public static readonly CREDENTIAL_SUBJECT = 'credentialSubject';
    public static readonly TYPE = 'type';
    public static readonly VERIFIABLE_CREDENTIAL_TYPE = 'VerifiableCredential';
    public static readonly ISSUER = 'issuer';
    public static readonly ISSUANCE_DATE = 'issuanceDate';
    public static readonly CREDENTIAL_STATUS = 'credentialStatus';
    public static readonly PROOF = 'proof';

    protected id: string;
    protected type: string[];
    protected issuer: Issuer;
    protected issuanceDate: Timestamp;
    protected subject: VcSubject[];
    protected context: string[];
    protected proof: any;

    constructor() {
        this.subject = [];
        this.context = [VcDocument.FIRST_CONTEXT_ENTRY];
        this.type = [VcDocument.VERIFIABLE_CREDENTIAL_TYPE];
    }

    public getContext(): string[] {
        return this.context;
    }

    public setId(id: string): void {
        this.id = id;
    }

    public getId(): string {
        return this.id;
    }

    public getType(): string[] {
        return this.type;
    }

    public getIssuer(): Issuer {
        return this.issuer;
    }

    public getIssuerDid(): string {
        if (this.issuer) {
            return this.issuer.getId();
        }
        return null;
    }

    public setIssuer(issuer: string | Issuer | DIDDocument): void {
        if (typeof issuer === 'string') {
            this.issuer = new Issuer(issuer);
        } else if (issuer instanceof Issuer) {
            this.issuer = issuer;
        } else if (issuer instanceof DIDDocument) {
            this.issuer = new Issuer(issuer.getDid());
        }
    }

    public getIssuanceDate(): Timestamp {
        return this.issuanceDate;
    }

    public setIssuanceDate(issuanceDate: Timestamp): void {
        this.issuanceDate = issuanceDate;
    }

    public addContext(context: string): void {
        if (this.context.indexOf(context) == -1) {
            this.context.push(context);
        }
    }

    public addType(type: string): void {
        if (this.type.indexOf(type) == -1) {
            this.type.push(type);
        }
    }

    public getCredentialSubject(index: number = 0): VcSubject {
        return this.subject[index];
    }

    public getCredentialSubjects(): VcSubject[] {
        return this.subject;
    }

    public getProof(): any {
        return this.proof;
    }

    public setProof(proof: any): void {
        this.proof = proof;
    }

    public getSubjectType(): string {
        return this.getCredentialSubject(0)?.getType();
    }

    public get length(): number {
        return this.subject.length;
    }

    public toJson(): string {
        return JSON.stringify(this.toJsonTree());
    }

    public static fromJson(json: string): VcDocument {
        let result: VcDocument;
        try {
            const root = JSON.parse(json);
            result = VcDocument.fromJsonTree(root);
        } catch (e) {
            throw new Error('Given JSON string is not a valid VcDocument ' + e.message);
        }
        return result;
    }

    public toJsonTree(): IVC {
        const rootObject: any = {};

        if (this.id)
            rootObject[VcDocument.ID] = this.id;
        if (this.type)
            rootObject[VcDocument.TYPE] = this.type;
        if (this.issuer)
            rootObject[VcDocument.ISSUER] = this.issuer.toJsonTree();
        if (this.issuanceDate)
            rootObject[VcDocument.ISSUANCE_DATE] = TimestampUtils.toJSON(this.issuanceDate);

        const context = [];
        if (this.context) {
            for (let index = 0; index < this.context.length; index++) {
                const element = this.context[index];
                context.push(element);
            }
        }
        rootObject[VcDocument.CONTEXT] = context;

        const credentialSubject = [];
        if (this.subject) {
            for (let index = 0; index < this.subject.length; index++) {
                const element = this.subject[index];
                credentialSubject.push(element.toJsonTree());
            }
        }
        rootObject[VcDocument.CREDENTIAL_SUBJECT] = credentialSubject;

        if (this.proof) {
            rootObject[VcDocument.PROOF] = this.proof;
        }

        return rootObject;
    }


    public static fromJsonTree(json: IVC): VcDocument {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = new VcDocument();

        if (json[VcDocument.ID])
            result.id = json[VcDocument.ID];
        if (json[VcDocument.TYPE])
            result.type = json[VcDocument.TYPE];
        if (json[VcDocument.ISSUER])
            result.issuer = Issuer.fromJsonTree(json[VcDocument.ISSUER]);
        if (json[VcDocument.ISSUANCE_DATE])
            result.issuanceDate = TimestampUtils.fromJson(json[VcDocument.ISSUANCE_DATE]);

        const jsonCredentialSubject = json[VcDocument.CREDENTIAL_SUBJECT];
        if (jsonCredentialSubject) {
            if (Array.isArray(jsonCredentialSubject)) {
                for (let i = 0; i < jsonCredentialSubject.length; i++) {
                    const item = jsonCredentialSubject[i];
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
                for (let i = 0; i < context.length; i++) {
                    const item = context[i];
                    result.addContext(item);
                }
            } else {
                result.addContext(context);
            }

            result.context = context.slice();
        }

        if (json[VcDocument.PROOF])
            result.proof = json[VcDocument.PROOF];

        return result;
    }

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

    public addCredentialSubject(subject: VcSubject): void {
        if (subject) {
            this.subject.push(subject);
        }
    }

    public addCredentialSubjects(subjects: VcSubject[]): void {
        if (subjects) {
            for (let index = 0; index < subjects.length; index++) {
                this.subject.push(subjects[index]);
            }
        }
    }

    public getDocument(): IVC {
        return this.toJsonTree();
    }

    public proofFromJson(json: any): void {
        this.setProof(json[VcDocument.PROOF]);
    }
}