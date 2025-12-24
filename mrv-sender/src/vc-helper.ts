import { DocumentLoader } from "./document-loader/document-loader.js";
import { DocumentLoaderFunction } from "./document-loader/document-loader-function.js";
import { Ed25519Signature2018, Ed25519VerificationKey2018 } from '@transmute/ed25519-signature-2018';
import { ld as vcjs } from '@transmute/vc.js';

export class VCHelper {
    private documentLoaders: DocumentLoader[];
    private loader!: DocumentLoaderFunction;

    constructor() {
        this.documentLoaders = [];
    }

    public addDocumentLoader(documentLoader: DocumentLoader): void {
        this.documentLoaders.push(documentLoader);
    }

    public buildDocumentLoader(): void {
        this.loader = DocumentLoader.build(this.documentLoaders);
    }

    public async createSuite(didDocument: any): Promise<Ed25519Signature2018> {
        const verificationMethod = didDocument.verificationMethod[0];
        const key = await Ed25519VerificationKey2018.from(verificationMethod);
        return new Ed25519Signature2018({ key: key });
    }

    public async issue(
        vc: any,
        suite: Ed25519Signature2018,
        documentLoader: DocumentLoaderFunction
    ): Promise<any> {
        return await vcjs.createVerifiableCredential({
            credential: vc,
            suite: suite,
            documentLoader: documentLoader,
        });
    }

    public async createVC(subject: any, didDocument:any, did:string): Promise<any> {
        const id = this.randomUUID();
        const suite = await this.createSuite(didDocument);
        const vc = {
            "id": 'urn:uuid:' + id,
            "type": ["VerifiableCredential"],
            "issuer": did,
            "issuanceDate": (new Date()).toISOString(),
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            "credentialSubject": [subject]
        }
        return await this.issue(vc, suite, this.loader);
    }

    public randomUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
