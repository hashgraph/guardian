import {
    VCJS,
    DefaultDocumentLoader,
    VcDocumentDefinition as VcDocument,
    VpDocumentDefinition as VpDocument,
    CommonDidDocument,
    HederaDidDocument,
    HederaEd25519Method,
    HederaBBSMethod,
    Environment,
} from '../hedera-modules';
import {
    SchemaDocumentLoader,
    VCSchemaLoader,
    SubjectSchemaLoader,
    DIDDocumentLoader,
    ContextDocumentLoader, DryRunLoader, HederaLoader,
} from '../document-loader';
import {
    ICredentialSubject,
    SchemaEntity,
    SignatureType,
} from '@guardian/interfaces';
import { PrivateKey, TopicId } from '@hashgraph/sdk';
// tslint:disable-next-line:no-duplicate-imports
import { Schema } from '@guardian/interfaces';
import {
    BbsBlsSignatureProof2020,
    deriveProof,
} from '@mattrglobal/jsonld-signatures-bbs';
import { Singleton } from '../decorators/singleton';
import { DataBaseHelper } from './db-helper';
import { Schema as SchemaCollection } from '../entity';
import { DidDocument as DidDocumentCollection } from '../entity';
import { IDocumentOptions, ISuiteOptions } from '../hedera-modules/vcjs/vcjs';
import { SchemaDocumentLoaderV2 } from '../document-loader/schema-document-loader-v2';
import { VCSchemaLoaderV2 } from '../document-loader/vc-schema-loader-v2';
import { SubjectSchemaLoaderV2 } from '../document-loader/subject-schema-loader-v2';
import { KeyType, Users, Wallet } from '../helpers';
import { IAuthUser } from '../interfaces';

/**
 * Configured VCHelper
 */
@Singleton
export class VcHelper extends VCJS {
    constructor() {
        super();
        const defaultDocumentLoader = new DefaultDocumentLoader();
        const dryRunLoader = new DryRunLoader();
        const didDocumentLoader = new DIDDocumentLoader();
        const hederaLoader = new HederaLoader();
        const schemaDocumentLoader = new SchemaDocumentLoader();
        const schemaDocumentLoaderV2 = new SchemaDocumentLoaderV2();
        const contextDocumentLoader = new ContextDocumentLoader('');

        const vcSchemaObjectLoader = new VCSchemaLoader('');
        const vcSchemaObjectLoaderV2 = new VCSchemaLoaderV2('');
        const subjectSchemaObjectLoader = new SubjectSchemaLoader('');
        const subjectSchemaObjectLoaderV2 = new SubjectSchemaLoaderV2('');

        this.addDocumentLoader(defaultDocumentLoader);
        this.addDocumentLoader(dryRunLoader);
        this.addDocumentLoader(hederaLoader);
        this.addDocumentLoader(didDocumentLoader);
        this.addDocumentLoader(schemaDocumentLoader);
        this.addDocumentLoader(schemaDocumentLoaderV2);
        this.addDocumentLoader(contextDocumentLoader);

        this.addSchemaLoader(vcSchemaObjectLoader);
        this.addSchemaLoader(vcSchemaObjectLoaderV2);
        this.addSchemaLoader(subjectSchemaObjectLoader);
        this.addSchemaLoader(subjectSchemaObjectLoaderV2);

        this.buildDocumentLoader();
        this.buildSchemaLoader();
    }

    /**
     * Get schema by context
     * @param context context
     * @param type type
     * @returns Schema
     */
    public static async getSchemaByContext(
        context: string | string[],
        type: string
    ): Promise<Schema> {
        try {
            context = Array.isArray(context) ? context : [context];
            if (!type) {
                throw new Error('Type is not defined');
            }
            const iri = '#' + type?.split('&')[0];
            if (context && context.length) {
                for (const c of context) {
                    if (c.startsWith('schema#') || c.startsWith('schema:')) {
                        return new Schema(
                            await new DataBaseHelper(SchemaCollection).findOne({
                                iri,
                            })
                        );
                    }
                    return new Schema(
                        await new DataBaseHelper(SchemaCollection).findOne({
                            where: {
                                contextURL: { $in: context },
                            },
                        })
                    );
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     *Load DID document
     * @param topic
     * @param needKey
     */
    public async loadDidDocument(did: string, user?: IAuthUser): Promise<HederaDidDocument> {
        if (!did) {
            return null;
        }
        const row = await new DataBaseHelper(DidDocumentCollection).findOne({ did });
        if (!row) {
            return null;
        }

        const document = HederaDidDocument.from(row.document);
        document.setDidTopicId(row.topicId);

        let walletToken: string;
        if (user) {
            walletToken = user.walletToken;
        } else {
            walletToken = (await (new Users()).getUserById(did))?.walletToken;
        }

        const keys = row.verificationMethods || {};
        const keyName1 = keys[SignatureType.Ed25519Signature2018];
        const keyName2 = keys[SignatureType.BbsBlsSignature2020];

        const wallet = new Wallet();
        const hederaPrivateKey = await wallet.getKey(walletToken, KeyType.KEY, did);

        if (keyName1) {
            const keyValue1 = await wallet.getKey(walletToken, KeyType.DID_KEYS, keyName1);
            document.setPrivateKey(keyName1, keyValue1);
        } else {
            document.setPrivateKey(HederaEd25519Method.defaultId(did), hederaPrivateKey);
        }

        if (keyName2) {
            const keyValue2 = await wallet.getKey(walletToken, KeyType.DID_KEYS, keyName2);
            document.setPrivateKey(keyName2, keyValue2);
        } else {
            document.setPrivateKey(HederaBBSMethod.defaultId(did), hederaPrivateKey);
        }

        return document;
    }

    /**
     * Create topic config by json
     * @param topic
     * @param needKey
     */
    public async saveDidDocument(document: CommonDidDocument, user: IAuthUser): Promise<DidDocumentCollection> {
        const wallet = new Wallet();
        const keys = document.getPrivateKeys();
        const verificationMethods = {};
        for (const item of keys) {
            const { id, type, key } = item;
            verificationMethods[type] = id;
            await wallet.setKey(user.walletToken, KeyType.KEY, id, key);
        }
        const didDoc = await new DataBaseHelper(DidDocumentCollection).save({
            did: document.getDid(),
            document: document.getDocument(),
            verificationMethods
        });
        return didDoc;
    }

    /**
     * Generate verification method by Hedera key
     *
     * @param {string | TopicId} topicId
     * @param {string | PrivateKey} privateKey
     * 
     * @returns {HederaDidDocument} - DID Document
     */
    public async generateNewDid(topicId: string | TopicId, privateKey: string | PrivateKey): Promise<HederaDidDocument> {
        return await HederaDidDocument.generate(Environment.network, privateKey, topicId);
    }

    /**
     * Create reveal VC Document
     * @param vc VC Document
     * @returns Reveal VC Document
     */
    private async createRevealVC(vc: VcDocument): Promise<VcDocument> {
        try {
            const newVC = VcDocument.fromJson(vc.toJson());
            const credentialSubject = newVC.getCredentialSubject();
            const vcSchema = await VcHelper.getSchemaByContext(
                credentialSubject.getContext(),
                credentialSubject.getType()
            );
            vcSchema.fields.forEach((field) => {
                if (field.isPrivate) {
                    credentialSubject.removeField(field.name);
                } else if (
                    !['type', 'id'].includes(field.name) &&
                    credentialSubject.getField(field.name) !== undefined
                ) {
                    credentialSubject.frameField(field.name);
                }
            });
            credentialSubject.setField('@explicit', true);
            return newVC;
        } catch (error) {
            return null;
        }
    }

    /**
     * Derive vc proof
     * @param vc VC Document
     * @param revealVc Reveal VC DOcument
     * @returns VC Document
     */
    private async vcDeriveProof(
        vc: VcDocument,
        revealVc: VcDocument
    ): Promise<VcDocument> {
        try {
            const derivedProofVc = await deriveProof(
                vc.toJsonTree(),
                revealVc.toJsonTree(),
                {
                    suite: new BbsBlsSignatureProof2020(),
                    documentLoader: this.loader,
                }
            );
            delete derivedProofVc['sec:proof'];
            return VcDocument.fromJsonTree(derivedProofVc);
        } catch (error) {
            return null;
        }
    }

    /**
     * Set Ids for nested nodes in subject
     * @param subject Subject
     * @returns Subject
     */
    private setNestedNodeIds(subject: any): any {
        if (!subject || typeof subject !== 'object') {
            return subject;
        }
        if (subject && !subject.id) {
            subject.id = this.generateUUID();
        }
        for (const subjectFieldKey of Object.keys(subject)) {
            const subjectField = subject[subjectFieldKey];
            if (!Array.isArray(subjectField)) {
                subject[subjectFieldKey] = this.setNestedNodeIds(subjectField);
            } else {
                for (let i = 0; i < subject[subjectFieldKey].length; i++) {
                    subject[subjectFieldKey][i] = this.setNestedNodeIds(
                        subject[subjectFieldKey][i]
                    );
                }
            }
        }
        return subject;
    }

    /**
     * Get signature type by schema
     * 
     * @param subject Subject
     * @returns SignatureType
     */
    private async getSignatureTypeBySchema(subject: ICredentialSubject): Promise<SignatureType> {
        const vcSchema = await VcHelper.getSchemaByContext(subject['@context'], subject.type);
        const entity: SchemaEntity = vcSchema?.entity;
        if (entity === SchemaEntity.EVC) {
            return SignatureType.BbsBlsSignature2020;
        } else {
            return SignatureType.Ed25519Signature2018;
        }
    }

    /**
     * Prepare Subject
     * 
     * @param subject Subject
     * @param signatureType Signature Type
     * 
     * @returns ICredentialSubject
     */
    private prepareSubject(subject: ICredentialSubject, signatureType: SignatureType): ICredentialSubject {
        if (signatureType === SignatureType.BbsBlsSignature2020) {
            return this.setNestedNodeIds(JSON.parse(JSON.stringify(subject)));
        } else {
            return subject;
        }
    }

    /**
     * Prepare VCs
     * 
     * @param subject Subject
     * @param signatureType Signature Type
     * 
     * @returns ICredentialSubject
     */
    private async prepareVCs(vcs: VcDocument[]): Promise<VcDocument[]> {
        for (let i = 0; i < vcs.length; i++) {
            const item = vcs[i];
            if (item.getProof().type !== SignatureType.BbsBlsSignature2020) {
                continue;
            }
            const revealVc = await this.createRevealVC(item);
            vcs[i] = await this.vcDeriveProof(item, revealVc);
        }
        return vcs;
    }





    // /**
    //  * Create VC Document
    //  *
    //  * @param {string} did - DID
    //  * @param {PrivateKey | string} key - Private Key
    //  * @param {any} subject - Credential Object
    //  * @param {any} [group] - Issuer
    //  *
    //  * @returns {VcDocument} - VC Document
    //  *
    //  * @deprecated
    //  */
    // public override async createVC(
    //     did: string,
    //     key: string | PrivateKey,
    //     subject: ICredentialSubject,
    //     group?: any,
    // ): Promise<VcDocument> {
    //     const signatureType = await this.getSignatureTypeBySchema(subject);
    //     subject = this.prepareSubject(subject, signatureType);
    //     return await super.createVC(did, key, subject, group, signatureType);
    // }

    // /**
    //  * Create VC Document
    //  *
    //  * @param {ICredentialSubject} subject - Credential Object
    //  * @param {ISuiteOptions} suiteOptions - Suite Options (Issuer, Private Key, Signature Type)
    //  * @param {IDocumentOptions} [documentOptions] - Document Options (UUID, Group)
    //  *
    //  * @returns {VcDocument} - VC Document
    //  * 
    //  * @deprecated
    //  */
    // public override async createVcDocument(
    //     subject: ICredentialSubject,
    //     suiteOptions: ISuiteOptions,
    //     documentOptions?: IDocumentOptions
    // ): Promise<VcDocument> {
    //     suiteOptions.signatureType = await this.getSignatureTypeBySchema(subject);
    //     subject = this.prepareSubject(subject, suiteOptions.signatureType);
    //     return await super.createVcDocument(subject, suiteOptions, documentOptions);
    // }

    /**
     * Create VC Document
     *
     * @param {ICredentialSubject} subject - Credential Object
     * @param {CommonDidDocument} didDocument - DID Document
     * @param {SignatureType} signatureType - Signature type (Ed25519Signature2018, BbsBlsSignature2020)
     * @param {IDocumentOptions} [documentOptions] - Document Options (UUID, Group)
     *
     * @returns {VcDocument} - VC Document
     */
    public override async createVerifiableCredential(
        subject: ICredentialSubject,
        didDocument: CommonDidDocument,
        signatureType: SignatureType,
        documentOptions?: IDocumentOptions
    ): Promise<VcDocument> {
        signatureType = await this.getSignatureTypeBySchema(subject);
        subject = this.prepareSubject(subject, signatureType);
        return await super.createVerifiableCredential(subject, didDocument, signatureType, documentOptions);
    }

    // /**
    //  * Create VP Document
    //  *
    //  * @param {string} did - DID
    //  * @param {PrivateKey | string} key - Private Key
    //  * @param {VcDocument[]} vcs - VC Documents
    //  * @param {string} [uuid] - new uuid
    //  *
    //  * @returns {VpDocument} - VP Document
    //  *
    //  * @deprecated
    //  */
    // public override async createVP(
    //     did: string,
    //     key: string | PrivateKey,
    //     vcs: VcDocument[],
    //     uuid?: string
    // ): Promise<VpDocument> {
    //     vcs = await this.prepareVCs(vcs);
    //     return await super.createVP(did, key, vcs, uuid);
    // }

    // /**
    //  * Create VP Document
    //  *
    //  * @param {VcDocument[]} vcs - VC Documents
    //  * @param {ISuiteOptions} suiteOptions - Suite Options (Issuer, Private Key)
    //  * @param {IDocumentOptions} [documentOptions] - Document Options (UUID, Group)
    //  *
    //  * @returns {VpDocument} - VP Document
    //  * 
    //  * @deprecated
    //  */
    // public override async createVpDocument(
    //     vcs: VcDocument[],
    //     suiteOptions: ISuiteOptions,
    //     documentOptions?: IDocumentOptions
    // ): Promise<VpDocument> {
    //     vcs = await this.prepareVCs(vcs);
    //     return await super.createVpDocument(vcs, suiteOptions, documentOptions);
    // }

    /**
     * Create VP Document
     *
     * @param {VcDocument[]} vcs - VC Documents
     * @param {ISuiteOptions} suiteOptions - Suite Options (Issuer, Private Key)
     * @param {IDocumentOptions} [documentOptions] - Document Options (UUID, Group)
     *
     * @returns {VpDocument} - VP Document
     */
    public override async createVerifiablePresentation(
        vcs: VcDocument[],
        didDocument: CommonDidDocument,
        signatureType: SignatureType,
        documentOptions?: IDocumentOptions
    ): Promise<VpDocument> {
        vcs = await this.prepareVCs(vcs);
        return await super.createVerifiablePresentation(vcs, didDocument, signatureType, documentOptions);
    }
}
