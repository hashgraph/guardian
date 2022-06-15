import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ld as vcjs } from '@transmute/vc.js';
import { Ed25519Signature2018, Ed25519VerificationKey2018 } from '@transmute/ed25519-signature-2018';
import { PrivateKey } from '@hashgraph/sdk';
import { check, CheckResult } from '@transmute/jsonld-schema';
import { ICredentialSubject, IVC } from '@guardian/interfaces';
import { VcDocument } from './vc-document';
import { VpDocument } from './vp-document';
import { HederaUtils } from './../utils';
import { VcSubject } from './vc-subject';
import { TimestampUtils } from '../timestamp-utils';
import { DocumentLoaderFunction } from '../document-loader/document-loader-function';
import { DocumentLoader } from '../document-loader/document-loader';
import { SchemaLoader, SchemaLoaderFunction } from '../document-loader/schema-loader';
import { DidRootKey } from './did-document';

export interface ISuite {
    issuer: string;
    suite: Ed25519Signature2018;
}

/**
 * Connecting VCJS library
 */
export class VCJS {
    private documentLoaders: DocumentLoader[];
    private schemaLoaders: SchemaLoader[];
    private schemaContext: string[];
    private loader: DocumentLoaderFunction;
    private schemaLoader: SchemaLoaderFunction;

    constructor() {
        this.schemaContext = [];
        this.documentLoaders = [];
        this.schemaLoaders = [];
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
        this.schemaLoaders.push(schemaLoader);
    }

    /**
     * Build Schema Loader
     * Builded loader is used to sign and verify documents
     */
    public buildSchemaLoader(): void {
        this.schemaLoader = SchemaLoader.build(this.schemaLoaders);
    }

    /**
     * Create Suite by DID
     *
     * @param {string} id - Root DID
     * @param {string} did - DID
     * @param {PrivateKey} privateKey - Private Key
     *
     * @returns {Ed25519Signature2018} - Ed25519Signature2018
     */
    public async createSuite(document: DidRootKey): Promise<Ed25519Signature2018> {
        const verificationMethod = document.getPrivateVerificationMethod();
        const key = await Ed25519VerificationKey2018.from(verificationMethod);
        return new Ed25519Signature2018({ key: key });
    }

    /**
     * Issue VC Document
     *
     * @param {HcsVcDocument<T>} vcDocument - VC Document
     * @param {Ed25519Signature2018} suite - suite
     * @param {DocumentLoaderFunction} documentLoader - Document Loader
     *
     * @returns {HcsVcDocument<T>} - VC Document
     */
    public async issue(
        vcDocument: VcDocument,
        suite: Ed25519Signature2018,
        documentLoader: DocumentLoaderFunction
    ): Promise<VcDocument> {
        const vc = vcDocument.getDocument();
        const verifiableCredential = await vcjs.createVerifiableCredential({
            credential: vc,
            suite: suite,
            documentLoader: documentLoader,
        });
        vcDocument.proofFromJson(verifiableCredential);
        return vcDocument;
    }

    /**
     * Verify VC Document
     *
     * @param {HcsVcDocument<T>} vcDocument - VC Document
     * @param {DocumentLoaderFunction} documentLoader - Document Loader
     *
     * @returns {boolean} - status
     */
    public async verify(json: any, documentLoader: DocumentLoaderFunction): Promise<boolean> {
        const result = await vcjs.verifyVerifiableCredential({
            credential: json,
            suite: new Ed25519Signature2018(),
            documentLoader: documentLoader,
        });
        if (result.verified) {
            return true;
        } else {
            if (result.results) {
                for (let i = 0; i < result.results.length; i++) {
                    const element = result.results[i];
                    if (!element.verified && element.error && element.error.message) {
                        throw new Error(element.error.message);
                    }
                }
            }
            throw new Error('Verification error');
        }
    }

    /**
     * Issue VP Document
     *
     * @param {HcsVpDocument} vpDocument - VP Document
     * @param {Ed25519Signature2018} suite - suite
     * @param {DocumentLoaderFunction} documentLoader - Document Loader
     *
     * @returns {HcsVpDocument} - VP Document
     */
    public async issuePresentation(
        vpDocument: VpDocument,
        suite: Ed25519Signature2018,
        documentLoader: DocumentLoaderFunction
    ): Promise<VpDocument> {
        const vp = vpDocument.toJsonTree();
        const verifiablePresentation = await vcjs.createVerifiablePresentation({
            presentation: vp,
            challenge: '123',
            suite: suite,
            documentLoader: documentLoader,
        });
        vpDocument.proofFromJson(verifiablePresentation);
        return vpDocument;
    }


    /**
     * Verify Schema
     *
     * @param {HcsVcDocument<VcSubject>} vcDocument - VC Document
     *
     * @returns {CheckResult} - is verified
     */
    public async verifySchema(vcDocument: VcDocument | any): Promise<CheckResult> {
        let vc: IVC;
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

        const schema = await this.schemaLoader(subject['@context'], subject.type, 'vc');

        if (!schema) {
            throw new Error('Schema not found');
        }

        const ajv = new Ajv();
        addFormats(ajv);

        this.prepareSchema(schema);

        const validate = ajv.compile(schema);
        const valid = validate(vc);

        return new CheckResult(valid, 'JSON_SCHEMA_VALIDATION_ERROR', validate.errors as any);
    }

    /**
     * Verify VC Document
     *
     * @param {HcsVcDocument<VcSubject>} vcDocument - VC Document
     *
     * @returns {boolean} - is verified
     */
    public async verifyVC(vcDocument: VcDocument | any): Promise<boolean> {
        let vc: IVC;
        if (vcDocument && typeof vcDocument.toJsonTree === 'function') {
            vc = vcDocument.toJsonTree();
        } else {
            vc = vcDocument;
        }
        return await this.verify(vc, this.loader);
    }


    /**
     * Delete system fields from schema defs
     *
     * @param schema Schema
     */
    private prepareSchema(schema: any) {
        const defsObj = schema.$defs;
        if (!defsObj) {
            return;
        }

        const defsKeys = Object.keys(defsObj);
        for (let i = 0; i < defsKeys.length; i++) {
            const nestedSchema = defsObj[defsKeys[i]];
            const required = nestedSchema.required;
            if (!required || required.length === 0) {
                continue;
            }
            nestedSchema.required = required.filter(field => !nestedSchema.properties[field] || !nestedSchema.properties[field].readOnly);
        }
    }

    /**
     * Create VC Document
     *
     * @param {string} did - DID
     * @param {PrivateKey | string} privateKey - Private Key
     * @param {any} data - Credential Object
     * @param {string} schema - schema id
     *
     * @returns {HcsVcDocument<VcSubject>} - VC Document
     */
    public async createVC(
        did: string,
        key: string | PrivateKey,
        subject: ICredentialSubject,
        schema?: string
    ): Promise<VcDocument> {
        const document = DidRootKey.createByPrivateKey(did, key);
        const id = HederaUtils.randomUUID();
        const suite = await this.createSuite(document);
        const vcSubject = VcSubject.create(subject, schema);
        for (let i = 0; i < this.schemaContext.length; i++) {
            const element = this.schemaContext[i];
            vcSubject.addContext(element);
        }

        let vc = new VcDocument();
        vc.setId(id);
        vc.setIssuanceDate(TimestampUtils.now());
        vc.addCredentialSubject(vcSubject);
        vc.setIssuer(did);
        vc = await this.issue(vc, suite, this.loader);
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
        vcs: VcDocument[],
        uuid?: string,
    ): Promise<VpDocument> {
        uuid = uuid || HederaUtils.randomUUID();
        const document = DidRootKey.createByPrivateKey(did, key);
        const suite = await this.createSuite(document);
        let vp = new VpDocument();
        vp.setId(uuid);
        vp.addVerifiableCredentials(vcs);
        vp = await this.issuePresentation(vp, suite, this.loader);
        return vp;
    }

    /**
     * Verify Subject
     *
     * @param {any} subject - subject
     *
     * @returns {CheckResult} - is verified
     */
    public async verifySubject(subject: any): Promise<CheckResult> {
        if (!this.schemaLoader) {
            throw new Error('Schema Loader not found');
        }

        const schema = await this.schemaLoader(subject['@context'], subject.type, 'subject');

        if (!schema) {
            throw new Error('Schema not found');
        }

        const ajv = new Ajv();
        addFormats(ajv);

        this.prepareSchema(schema);

        const validate = ajv.compile(schema);
        const valid = validate(subject);

        return new CheckResult(valid, 'JSON_SCHEMA_VALIDATION_ERROR', validate.errors as any);
    }
}
