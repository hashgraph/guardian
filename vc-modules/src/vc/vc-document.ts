import { CredentialSubject, HcsVcDocumentBase, HcsVcDocumentJsonProperties, JsonClass } from '@hashgraph/did-sdk-js';

/**
 * The base for a VC document generation in JSON-LD format.
 * VC documents according to W3C draft specification must be compatible with JSON-LD version 1.1 Up until now there is
 */
export class HcsVcDocument<T extends CredentialSubject> extends HcsVcDocumentBase<T> {
    private proof: any;

    /**
     * Adds an additional type to `type` field of the VC document.
     *
     * @param type The type to add.
     */
    public addType(type: string): void {
        this.type.push(type);
    }

    public getProof(): any {
        return this.proof;
    }

    public setProof(proof: any): void {
        this.proof = proof;
    }

    public proofFromJson(json: any): void {
        this.setProof(json[HcsVcDocumentJsonProperties.PROOF]);
    }

    public toJsonTree(): any {
        const root = super.toJsonTree();
        const json = {}
        if (root[HcsVcDocumentJsonProperties.CONTEXT])
            json[HcsVcDocumentJsonProperties.CONTEXT] = root[HcsVcDocumentJsonProperties.CONTEXT];
        if (root[HcsVcDocumentJsonProperties.ID])
            json[HcsVcDocumentJsonProperties.ID] = root[HcsVcDocumentJsonProperties.ID];
        if (root[HcsVcDocumentJsonProperties.TYPE])
            json[HcsVcDocumentJsonProperties.TYPE] = root[HcsVcDocumentJsonProperties.TYPE];
        if (root[HcsVcDocumentJsonProperties.CREDENTIAL_SUBJECT])
            json[HcsVcDocumentJsonProperties.CREDENTIAL_SUBJECT] = root[HcsVcDocumentJsonProperties.CREDENTIAL_SUBJECT];
        if (root[HcsVcDocumentJsonProperties.ISSUER])
            json[HcsVcDocumentJsonProperties.ISSUER] = root[HcsVcDocumentJsonProperties.ISSUER];
        if (root[HcsVcDocumentJsonProperties.ISSUANCE_DATE])
            json[HcsVcDocumentJsonProperties.ISSUANCE_DATE] = root[HcsVcDocumentJsonProperties.ISSUANCE_DATE];
        if (this.proof) {
            json[HcsVcDocumentJsonProperties.PROOF] = this.proof;
        }
        return json;
    }

    public toJSON(): any {
        return JSON.stringify(this.toJsonTree());
    }

    public static fromJsonTree<U extends CredentialSubject>(root: any, result?: HcsVcDocument<U>, credentialSubjectClass?: JsonClass<U>): HcsVcDocument<U> {
        let baseClass = result;
        if (!baseClass) {
            baseClass = new HcsVcDocument();
        }
        result = super.fromJsonTree(root, baseClass, credentialSubjectClass) as HcsVcDocument<U>;
        result.proof = root[HcsVcDocumentJsonProperties.PROOF] || null;
        return result;
    }

    public static fromJson<U extends CredentialSubject>(json: string, credentialSubjectClass: JsonClass<U>): HcsVcDocument<U> {
        const root = JSON.parse(json);
        return this.fromJsonTree(root, null, credentialSubjectClass);
    }
}
