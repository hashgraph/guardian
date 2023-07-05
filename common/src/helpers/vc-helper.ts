import {
    VCJS,
    DefaultDocumentLoader,
    VcDocumentDefinition as VcDocument,
    VpDocumentDefinition as VpDocument,
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
import { PrivateKey } from '@hashgraph/sdk';
// tslint:disable-next-line:no-duplicate-imports
import { Schema } from '@guardian/interfaces';
import {
    BbsBlsSignatureProof2020,
    deriveProof,
} from '@mattrglobal/jsonld-signatures-bbs';
import { Singleton } from '../decorators/singleton';
import { DataBaseHelper } from './db-helper';
import { Schema as SchemaCollection } from '../entity';

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
        const contextDocumentLoader = new ContextDocumentLoader('');

        const vcSchemaObjectLoader = new VCSchemaLoader('');
        const subjectSchemaObjectLoader = new SubjectSchemaLoader('');

        this.addDocumentLoader(defaultDocumentLoader);
        this.addDocumentLoader(dryRunLoader);
        this.addDocumentLoader(hederaLoader);
        this.addDocumentLoader(didDocumentLoader);
        this.addDocumentLoader(schemaDocumentLoader);
        this.addDocumentLoader(contextDocumentLoader);

        this.addSchemaLoader(vcSchemaObjectLoader);
        this.addSchemaLoader(subjectSchemaObjectLoader);

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
                    if (c.startsWith('schema#')) {
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
     * Create VC Document
     *
     * @param {string} did - DID
     * @param {PrivateKey | string} key - Private Key
     * @param {any} subject - Credential Object
     * @param {any} [group] - Issuer
     * @returns {HcsVcDocument<VcSubject>} - VC Document
     */
    public override async createVC(
        did: string,
        key: string | PrivateKey,
        subject: ICredentialSubject,
        group?: any
    ): Promise<VcDocument> {
        const vcSchema = await VcHelper.getSchemaByContext(
            subject['@context'],
            subject.type
        );
        switch (vcSchema?.entity) {
            case SchemaEntity.EVC:
                return await super.createVC(
                    did,
                    key,
                    this.setNestedNodeIds(JSON.parse(JSON.stringify(subject))),
                    group,
                    SignatureType.BbsBlsSignature2020
                );
            default:
                return await super.createVC(did, key, subject, group);
        }
    }

    /**
     * Create VP Document
     *
     * @param {string} did - DID
     * @param {PrivateKey | string} key - Private Key
     * @param {HcsVcDocument<VcSubject>[]} vcs - VC Documents
     * @param {string} [uuid] - new uuid
     *
     * @returns {HcsVpDocument} - VP Document
     */
    public override async createVP(
        did: string,
        key: string | PrivateKey,
        vcs: VcDocument[],
        uuid?: string
    ): Promise<VpDocument> {
        for (let i = 0; i < vcs.length; i++) {
            const item = vcs[i];
            if (item.getProof().type !== SignatureType.BbsBlsSignature2020) {
                continue;
            }
            const revealVc = await this.createRevealVC(item);
            vcs[i] = await this.vcDeriveProof(item, revealVc);
        }
        return await super.createVP(did, key, vcs, uuid);
    }
}
