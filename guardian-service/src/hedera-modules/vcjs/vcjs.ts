import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ld as vcjs } from '@transmute/vc.js';
import { Ed25519Signature2018, Ed25519VerificationKey2018 } from '@transmute/ed25519-signature-2018';
import { PrivateKey } from '@hashgraph/sdk';
import { CheckResult } from '@transmute/jsonld-schema';
import { GenerateUUIDv4, ICredentialSubject, IVC } from '@guardian/interfaces';
import { VcDocument } from './vc-document';
import { VpDocument } from './vp-document';
import { VcSubject } from './vc-subject';
import { TimestampUtils } from '../timestamp-utils';
import { DocumentLoaderFunction } from '../document-loader/document-loader-function';
import { DocumentLoader } from '../document-loader/document-loader';
import { SchemaLoader, SchemaLoaderFunction } from '../document-loader/schema-loader';
import { DidRootKey } from './did-document';
import { Issuer } from './issuer';

/**
 * Suite interface
 */
export interface ISuite {
    /**
     * Issuer
     */
    issuer: string;
    /**
     * Suite
     */
    suite: Ed25519Signature2018;
}

/**
 * Connecting VCJS library
 */
export class VCJS {
    /**
     * Document loaders
     * @private
     */
    private readonly documentLoaders: DocumentLoader[];
    /**
     * Schema loaders
     * @private
     */
    private readonly schemaLoaders: SchemaLoader[];
    /**
     * Schema context
     * @private
     */
    private readonly schemaContext: string[];
    /**
     * Loader
     * @private
     */
    private loader: DocumentLoaderFunction;
    /**
     * Schema loader
     * @private
     */
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
        return new Ed25519Signature2018({ key });
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
        const vc: any = vcDocument.getDocument();
        const verifiableCredential = await vcjs.createVerifiableCredential({
            credential: vc,
            suite,
            documentLoader,
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
            documentLoader,
        });
        if (result.verified) {
            return true;
        } else {
            if (result.results) {
                for (const element of result.results) {
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
            suite,
            documentLoader,
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
        for (const key of defsKeys) {
            const nestedSchema = defsObj[key];
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
     * @param {PrivateKey | string} key - Private Key
     * @param {any} subject - Credential Object
     *
     * @returns {HcsVcDocument<VcSubject>} - VC Document
     */
    public async createVC(
        did: string,
        key: string | PrivateKey,
        subject: ICredentialSubject,
        group?: {
            groupId: string,
            context: string,
            type: string
        }
    ): Promise<VcDocument> {
        const document = DidRootKey.createByPrivateKey(did, key);
        const id = GenerateUUIDv4();
        const suite = await this.createSuite(document);
        const vcSubject = VcSubject.create(subject);
        for (const element of this.schemaContext) {
            vcSubject.addContext(element);
        }

        let vc = new VcDocument();
        vc.setId(id);
        vc.setIssuanceDate(TimestampUtils.now());
        vc.addCredentialSubject(vcSubject);
        
        if(group) {
            vc.setIssuer(new Issuer(did, group.groupId));
            vc.addType(group.type);
            vc.addContext(group.context);
        } else {
            vc.setIssuer(new Issuer(did));
        }

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
        uuid = uuid || GenerateUUIDv4();
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

    /**
     * Add Context
     *
     * @param {any} subject - subject
     * @param {any} context - new context
     * @returns {any} - subject
     */
    public addContextInSubject(subject: any, context: string): any {
        if (subject['@context']) {
            if (Array.isArray(subject['@context'])) {
                subject['@context'].push(context);
            } else {
                subject['@context'] = [subject['@context'], context];
            }
        } else {
            subject['@context'] = [context];
        }
        return subject
    }

    /**
     * Add Context
     *
     * @param {any} subject - subject
     * @returns {any} - subject
     */
    public addDryRunContext(subject: any): any {
        if (subject.type) {
            subject['@context'] = [`schema#${subject.type}`];
        }
        return subject;
    }
}