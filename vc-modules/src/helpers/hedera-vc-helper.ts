import { PrivateKey } from "@hashgraph/sdk";
import {
    TimestampUtils,
    HcsDidRootKey
} from "did-sdk-js";
import { VcSubject } from "../vc/vc-subject";
import { HcsVcDocument } from "../vc/vc-document";
import { VCJS } from "../vc/vcjs";
import { DocumentLoader } from "../document-loader/document-loader";
import { DocumentLoaderFunction } from "../document-loader/document-loader-function";
import { Utils } from "./utils";
import { HcsVpDocument } from "../vc/vp-document";

export class VCHelper {
    private documentLoaders: DocumentLoader[];
    private schemaContext: string[];
    private loader: DocumentLoaderFunction;

    constructor() {
        this.schemaContext = [];
        this.documentLoaders = [];
    }

    public addContext(context: string): void {
        this.schemaContext.push(context);
    }

    public addDocumentLoader(documentLoader: DocumentLoader): void {
        this.documentLoaders.push(documentLoader);
    }

    public buildDocumentLoader(): void {
        this.loader = DocumentLoader.build(this.documentLoaders)
    }

    private async getSuite(did: string, key: string | PrivateKey): Promise<any> {
        const privateKey = (typeof key == "string") ? PrivateKey.fromString(key) : key;
        const didRoot = HcsDidRootKey.fromId(did);
        const didId = didRoot.getController();
        const didRootId = didRoot.getId();
        return { didRootId, didId, privateKey };
    }

    public async createCredential(
        did: string,
        schema: string,
        data: any
    ): Promise<any> {
        const id = Utils.randomUUID();
        const vcSubject = new VcSubject(schema, data);
        for (let i = 0; i < this.schemaContext.length; i++) {
            const element = this.schemaContext[i];
            vcSubject.addContext(element);
        }

        let vc = new HcsVcDocument<VcSubject>();
        vc.setId(id);
        vc.setIssuanceDate(TimestampUtils.now());
        vc.addType(vcSubject.getType());
        vc.addCredentialSubject(vcSubject);
        vc.setIssuer(did);
        return vc.toJsonTree();
    }

    public async issueCredential(
        did: string,
        key: string | PrivateKey,
        credential: any
    ): Promise<HcsVcDocument<VcSubject>> {
        const document = await this.getSuite(did, key);
        const didRootId = document.didRootId;
        const didId = document.didId;
        const privateKey = document.privateKey;
        const suite = await VCJS.createSuite(didRootId, didId, privateKey);

        let vc = HcsVcDocument.fromJsonTree<VcSubject>(credential, null, VcSubject);
        vc.setIssuer(didId);
        vc = await VCJS.issue(vc, suite, this.loader);
        return vc;
    }

    public async createVC(
        did: string,
        key: string | PrivateKey,
        schema: string,
        data: any
    ): Promise<HcsVcDocument<VcSubject>> {
        const document = await this.getSuite(did, key);
        const id = Utils.randomUUID();
        const didRootId = document.didRootId;
        const didId = document.didId;
        const privateKey = document.privateKey;
        const suite = await VCJS.createSuite(didRootId, didId, privateKey);

        const vcSubject = new VcSubject(schema, data);
        for (let i = 0; i < this.schemaContext.length; i++) {
            const element = this.schemaContext[i];
            vcSubject.addContext(element);
        }

        let vc = new HcsVcDocument<VcSubject>();
        vc.setId(id);
        vc.setIssuanceDate(TimestampUtils.now());
        vc.addType(vcSubject.getType());
        vc.addCredentialSubject(vcSubject);
        vc.setIssuer(didId);

        vc = await VCJS.issue(vc, suite, this.loader);

        return vc;
    }

    public async createVP(
        did: string,
        key: string | PrivateKey,
        vcs: HcsVcDocument<VcSubject>[],
        uuid?: string,
    ): Promise<HcsVpDocument> {
        uuid = uuid || Utils.randomUUID();
        const privateKey = (typeof key == "string") ? PrivateKey.fromString(key) : key;
        const didRoot = HcsDidRootKey.fromId(did);
        const didId = didRoot.getController();
        const didRootId = didRoot.getId();
        const suite = await VCJS.createSuite(didRootId, didId, privateKey);

        let vp = new HcsVpDocument();
        vp.setId(uuid);
        vp.addVerifiableCredential(vcs);
        vp = await VCJS.issuePresentation(vp, suite, this.loader);
        return vp;
    }

    public async verifyVC(vcDocument: HcsVcDocument<VcSubject> | any) {
        let vc: any;
        if (vcDocument && typeof vcDocument.toJsonTree === "function") {
            vc = vcDocument.toJsonTree();
        } else {
            vc = vcDocument;
        }
        const verify = await VCJS.verify(vc, this.loader);
        return verify;
    }
}
