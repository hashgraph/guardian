import { DidDocument } from '@entity/did-document';
import { VcDocument } from '@entity/vc-document';
import { VpDocument } from '@entity/vp-document';
import {
    IChainItem,
    MessageAPI,
    SchemaEntity
} from '@guardian/interfaces';
import {
    VpDocument as HVpDocument
} from '@hedera-modules';
import { ApiResponse } from '@api/api-response';
import { MessageResponse, MessageError, Logger, DataBaseHelper } from '@guardian/common';

/**
 * Get field
 * @param vcDocument
 * @param name
 */
function getField(vcDocument: VcDocument, name: string): any {
    if (
        vcDocument &&
        vcDocument.document &&
        vcDocument.document.credentialSubject &&
        vcDocument.document.credentialSubject[0]
    ) {
        return vcDocument.document.credentialSubject[0][name];
    }
    return null;
}

/**
 * Get issuer
 * @param vcDocument
 */
function getIssuer(vcDocument: VcDocument): string {
    if (vcDocument && vcDocument.document) {
        if (typeof vcDocument.document.issuer === 'string') {
            return vcDocument.document.issuer;
        } else {
            return vcDocument.document.issuer.id || null;
        }
    }
    return null;
}

/**
 * Check policy
 * @param vcDocument
 * @param policyId
 */
function checkPolicy(vcDocument: VcDocument, policyId: string) {
    if (vcDocument) {
        if (!vcDocument.policyId || vcDocument.policyId === policyId) {
            return true;
        }
    }
    return false;
}

/**
 * Connecting to the message broker methods of working with trust chain.
 *
 * @param channel - channel
 * @param didDocumentRepository - table with DID Documents
 * @param vcDocumentRepository - table with VC Documents
 * @param vpDocumentRepository - table with VP Documents
 */
export async function trustChainAPI(
    didDocumentRepository: DataBaseHelper<DidDocument>,
    vcDocumentRepository: DataBaseHelper<VcDocument>,
    vpDocumentRepository: DataBaseHelper<VpDocument>
): Promise<void> {
    /**
     * Search parent by VC or VP Document
     *
     * @param {IChainItem[]} chain - current trust chain
     * @param {VcDocument | VpDocument} vc - Document
     * @param {Object} map - ids map
     * @param {string} policyId - policy Id
     */
    const getParents = async (chain: IChainItem[], vc: VcDocument | VpDocument, map: any, policyId: any): Promise<void> => {
        if (!vc) {
            return;
        }

        const issuer = getIssuer(vc as VcDocument);
        const schema = getField(vc as VcDocument, 'type');

        if (map[vc.hash]) {
            return;
        } else {
            map[vc.hash] = true;
        }

        chain.push({
            type: 'VC',
            id: vc.hash,
            document: vc.document,
            entity: vc.type,
            owner: vc.owner,
            schema,
            tag: vc.tag,
            label: 'HASH'
        });

        const didDocuments = await didDocumentRepository.find({ where: { did: { $eq: issuer } } });

        chain.push({
            type: 'DID',
            id: issuer,
            document: didDocuments,
            owner: issuer,
            schema: null,
            label: 'DID',
            entity: 'DID',
            tag: null
        });

        let parents = await vcDocumentRepository.find({
            where: {
                'document.credentialSubject.id': { $eq: issuer }
            }
        });

        if (policyId) {
            parents = parents.filter(_vc => checkPolicy(_vc, policyId));
        }

        const parent = parents[0];
        if (parent) {
            await getParents(chain, parent, map, policyId);
        }
    }

    /**
     * Return Policy Info by Policy Id
     *
     * @param {IChainItem[]} chain - current trust chain
     * @param {string} policyId - policy Id
     */
    const getPolicyInfo = async (chain: IChainItem[], policyId: any): Promise<void> => {
        if (policyId) {
            let issuer: string;

            const policyCreated = await vcDocumentRepository.findOne({
                where: {
                    type: { $eq: SchemaEntity.POLICY },
                    policyId: { $eq: policyId }
                }
            });

            const policyImported = await vcDocumentRepository.findOne({
                where: {
                    type: { $eq: 'POLICY_IMPORTED' },
                    policyId: { $eq: policyId }
                }
            });

            if (policyCreated) {
                issuer = getIssuer(policyCreated);
                chain.push({
                    type: 'VC',
                    id: policyCreated.hash,
                    document: policyCreated.document,
                    owner: policyCreated.owner,
                    schema: getField(policyCreated, 'type'),
                    label: 'HASH',
                    entity: 'Policy',
                    tag: 'Policy Created'
                });
            } else if (policyImported) {
                issuer = getIssuer(policyImported);
                chain.push({
                    type: 'VC',
                    id: policyImported.hash,
                    document: policyImported.document,
                    owner: policyImported.owner,
                    schema: getField(policyImported, 'type'),
                    label: 'HASH',
                    entity: 'Policy',
                    tag: 'Policy Imported'
                });
            }

            if (issuer) {
                const didDocuments = await didDocumentRepository.find({ where: { did: { $eq: issuer } } });
                const standardRegistries = await vcDocumentRepository.find({
                    where: {
                        type: { $eq: SchemaEntity.STANDARD_REGISTRY },
                        owner: { $eq: issuer }
                    }
                });
                if (didDocuments) {
                    chain.push({
                        type: 'DID',
                        id: issuer,
                        document: didDocuments,
                        owner: issuer,
                        schema: null,
                        label: 'DID',
                        entity: 'DID',
                        tag: null
                    });
                }
                for (const standardRegistry of standardRegistries) {
                    chain.push({
                        type: 'VC',
                        id: standardRegistry.hash,
                        document: standardRegistry.document,
                        owner: standardRegistry.owner,
                        schema: getField(standardRegistry, 'type'),
                        label: 'HASH',
                        entity: 'StandardRegistry',
                        tag: 'Account Creation'
                    });
                }
            }
        }
    }

    /**
     * Return trust chain
     *
     * @param {string} payload - hash or uuid
     *
     * @returns {IChainItem[]} - trust chain
     */
    ApiResponse(MessageAPI.GET_CHAIN, async (msg) => {
        try {
            const hash = msg.id;
            const chain: IChainItem[] = [];
            let root: VcDocument | VpDocument;

            root = await vcDocumentRepository.findOne({ hash });
            if (root) {
                const policyId = root.policyId;
                await getParents(chain, root, {}, policyId);
                await getPolicyInfo(chain, policyId);
                return new MessageResponse(chain);
            }

            root = await vpDocumentRepository.findOne({ hash });
            if (root) {
                const policyId = root.policyId;
                chain.push({
                    type: 'VP',
                    id: root.hash,
                    document: root.document,
                    owner: root.owner,
                    schema: 'VerifiablePresentation',
                    label: 'HASH',
                    entity: 'VP',
                    tag: root.tag
                });
                const vpDocument = HVpDocument.fromJsonTree(root.document);
                const vcpDocument = vpDocument.getVerifiableCredential(0);
                const hashVc = vcpDocument.toCredentialHash();
                const vc = await vcDocumentRepository.findOne({ hash: hashVc });
                await getParents(chain, vc, {}, policyId);
                await getPolicyInfo(chain, policyId);
                return new MessageResponse(chain);
            }

            root = await vpDocumentRepository.findOne({ where: { 'document.id': { $eq: hash } } });
            if (root) {
                const policyId = root.policyId;
                chain.push({
                    type: 'VP',
                    id: root.document.id,
                    document: root.document,
                    owner: root.owner,
                    schema: 'VerifiablePresentation',
                    label: 'ID',
                    entity: 'VP',
                    tag: root.tag
                });
                const vpDocument = HVpDocument.fromJsonTree(root.document);
                const vcpDocument = vpDocument.getVerifiableCredential(0);
                const hashVc = vcpDocument.toCredentialHash();
                const vc = await vcDocumentRepository.findOne({ hash: hashVc });
                await getParents(chain, vc, {}, policyId);
                await getPolicyInfo(chain, policyId);
                return new MessageResponse(chain);
            }

            await getPolicyInfo(chain, null);
            return new MessageResponse(chain);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error);
        }
    });
}
