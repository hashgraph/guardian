import { PrivateKey } from '@hashgraph/sdk';
import {
    TimestampUtils,
    HcsDidRootKey
} from 'did-sdk-js';
import { VcSubject } from '../vc/vc-subject';
import { HcsVcDocument } from '../vc/vc-document';
import { VCJS } from '../vc/vcjs';
import { DocumentLoader } from '../document-loader/document-loader';
import { DocumentLoaderFunction } from '../document-loader/document-loader-function';
import { Utils } from './utils';
import { HcsVpDocument } from '../vc/vp-document';
import { check } from '@transmute/jsonld-schema';
import { SchemaLoader } from '../document-loader/schema-loader';
/**
 * Methods for creating and verifying VC and VP documents
 */
export class VCHelper {
    private documentLoaders: DocumentLoader[];
    private schemaContext: string[];
    private loader: DocumentLoaderFunction;
    private schemaLoader: (type: string) => Promise<any>;

    constructor() {
        this.schemaContext = [];
        this.documentLoaders = [];
    }

    /**
     * Add Schema context
     * 
     * @param {string} context - context
     * 
     */
    public addContext(context: string): void {
        this.schemaContext.push(context);
    }

    /**
     * Add DID or Schema document loader
     * 
     * @param {DocumentLoader} documentLoader - Document Loader
     * 
     */
    public addDocumentLoader(documentLoader: DocumentLoader): void {
        this.documentLoaders.push(documentLoader);
    }

    /**
     * Build Document Loader
     * Builded loader is used to sign and verify documents
     * 
     * @param {DocumentLoader} documentLoader - Document Loader
     * 
     */
    public buildDocumentLoader(): void {
        this.loader = DocumentLoader.build(this.documentLoaders);
    }

    /**
     * Add Schema loader
     * 
     * @param {DocumentLoader} documentLoader - Document Loader
     * 
     */
    public addSchemaLoader(schemaLoader: SchemaLoader): void {
        if(schemaLoader) {
            this.schemaLoader = schemaLoader.get.bind(schemaLoader);
        } else {
            this.schemaLoader = null;
        }
    }

    /**
     * Create Suite by DID
     * 
     * @param {string} did - DID
     * @param {PrivateKey | string} privateKey - Private Key
     * 
     * @returns {any} - Root Id, DID, Private Key
     */
    private async getSuite(did: string, key: string | PrivateKey): Promise<any> {
        const privateKey = (typeof key == 'string') ? PrivateKey.fromString(key) : key;
        const didRoot = HcsDidRootKey.fromId(did);
        const didId = didRoot.getController();
        const didRootId = didRoot.getId();
        return { didRootId, didId, privateKey };
    }

    /**
     * Create Credential Object (VC without a signature)
     * 
     * @param {string} did - DID
     * @param {string} schema - schema id
     * @param {any} data - Object
     * 
     * @returns {any} - VC Document
     */
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
        // vc.addType(vcSubject.getType());
        vc.addCredentialSubject(vcSubject);
        vc.setIssuer(did);
        return vc.toJsonTree();
    }

    /**
     * Sign Credential Object
     * 
     * @param {string} did - DID
     * @param {PrivateKey | string} privateKey - Private Key
     * @param {any} credential - Credential Object
     * 
     * @returns {HcsVcDocument<VcSubject>} - VC Document
     */
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

    /**
     * Create VC Document
     * 
     * @param {string} did - DID
     * @param {PrivateKey | string} privateKey - Private Key
     * @param {string} schema - schema id
     * @param {any} data - Credential Object
     * 
     * @returns {HcsVcDocument<VcSubject>} - VC Document
     */
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
        // vc.addType(vcSubject.getType());
        vc.addCredentialSubject(vcSubject);
        vc.setIssuer(didId);

        vc = await VCJS.issue(vc, suite, this.loader);

        return vc;
    }

    /**
     * Create VP Document
     * 
     * @param {string} did - DID
     * @param {PrivateKey | string} privateKey - Private Key
     * @param {HcsVcDocument<VcSubject>[]} vcs - VC Documents
     * @param {string} [uuid] - new uuid
     * 
     * @returns {HcsVpDocument} - VP Document
     */
    public async createVP(
        did: string,
        key: string | PrivateKey,
        vcs: HcsVcDocument<VcSubject>[],
        uuid?: string
    ): Promise<HcsVpDocument> {
        uuid = uuid || Utils.randomUUID();
        const privateKey = (typeof key == 'string') ? PrivateKey.fromString(key) : key;
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

    /**
     * Verify VC Document
     * 
     * @param {HcsVcDocument<VcSubject>} vcDocument - VC Document
     * 
     * @returns {boolean} - is verified
     */
    public async verifyVC(vcDocument: HcsVcDocument<VcSubject> | any) {
        let vc: any;
        if (vcDocument && typeof vcDocument.toJsonTree === 'function') {
            vc = vcDocument.toJsonTree();
        } else {
            vc = vcDocument;
        }
        const verify = await VCJS.verify(vc, this.loader);
        return verify;
    }

    /**
     * Verify Schema
     * 
     * @param {HcsVcDocument<VcSubject>} vcDocument - VC Document
     * 
     * @returns {boolean} - is verified
     */
    public async verifySchema(vcDocument: HcsVcDocument<VcSubject> | any) {
        let vc: any;
        if (vcDocument && typeof vcDocument.toJsonTree === 'function') {
            vc = vcDocument.toJsonTree();
        } else {
            vc = vcDocument;
        }

        if (!vc.credentialSubject) {
            throw new Error('"credentialSubject" property is required.');
        }

        const subjects = vc.credentialSubject;
        const subject = Array.isArray(subjects) ? subjects[0] : subjects;

        if (!this.schemaLoader) {
            throw new Error('Schema Loader not found');
        }

        const schema = await this.schemaLoader(subject.type);

        if (!schema) {
            throw new Error('Schema not found');
        }

        try {
            const res = await check({
                input: vc,
                schema: schema,
                documentLoader: this.loader as any,
            });
            return res.ok;
        } catch (error) {
            return false;
        }
    }
}
