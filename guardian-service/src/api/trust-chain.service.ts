import { DidDocument } from '@entity/did-document';
import { VcDocument } from '@entity/vc-document';
import { VpDocument } from '@entity/vp-document';
import { IChainItem, MessageAPI, SchemaEntity } from 'interfaces';
import { MongoRepository } from 'typeorm';
import { HcsVpDocument } from 'vc-modules';

function getField(vcDocument: VcDocument | VpDocument, name: string): any {
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

function getIssuer(vcDocument: VcDocument | VpDocument): string {
    if (vcDocument && vcDocument.document) {
        return vcDocument.document.issuer;
    }
    return null;
}

function checkPolicy(vcDocument: VcDocument, policyId: string) {
    if (vcDocument) {
        if (!vcDocument.policyId || vcDocument.policyId == policyId) {
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
export const trustChainAPI = async function (
    channel: any,
    didDocumentRepository: MongoRepository<DidDocument>,
    vcDocumentRepository: MongoRepository<VcDocument>,
    vpDocumentRepository: MongoRepository<VpDocument>
): Promise<void> {
    /**
     * Search parent by VC or VP Document
     * 
     * @param {IChainItem[]} chain - current trust chain
     * @param {VcDocument | VpDocument} vc - Document
     * @param {Object} map - ids map
     * @param {string} policyId - policy Id
     */
    async function getParents(chain: IChainItem[], vc: VcDocument | VpDocument, map: any, policyId: any) {
        if (!vc) {
            return;
        }

        const issuer = getIssuer(vc);
        const schema = getField(vc, 'type');

        if (map[vc.hash]) {
            return;
        } else {
            map[vc.hash] = true;
        }

        chain.push({
            type: 'VC',
            id: vc.hash,
            document: vc.document,
            owner: vc.owner,
            schema: schema,
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
            tag: null
        });

        let parents = await vcDocumentRepository.find({
            where: {
                'document.credentialSubject.id': { $eq: issuer }
            }
        });

        if (policyId) {
            parents = parents.filter(vc => checkPolicy(vc, policyId));
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
    async function getPolicyInfo(chain: IChainItem[], policyId: any) {
        if (policyId) {
            const policy = await vcDocumentRepository.findOne({
                where: {
                    type: { $eq: SchemaEntity.POLICY },
                    policyId: { $eq: policyId }
                }
            });

            if (policy) {
                chain.push({
                    type: 'VC',
                    id: policy.hash,
                    document: policy.document,
                    owner: policy.owner,
                    schema: getField(policy, 'type'),
                    label: 'HASH',
                    tag: "Policy Created"
                });
                const issuer = getIssuer(policy);

                const didDocuments = await didDocumentRepository.find({ where: { did: { $eq: issuer } } });

                chain.push({
                    type: 'DID',
                    id: issuer,
                    document: didDocuments,
                    owner: issuer,
                    schema: null,
                    label: 'DID',
                    tag: null
                });

                const rootAuthority = await vcDocumentRepository.findOne({
                    where: {
                        type: { $eq: SchemaEntity.ROOT_AUTHORITY },
                        owner: { $eq: issuer }
                    }
                });
                if (rootAuthority) {
                    chain.push({
                        type: 'VC',
                        id: rootAuthority.hash,
                        document: rootAuthority.document,
                        owner: rootAuthority.owner,
                        schema: getField(rootAuthority, 'type'),
                        label: 'HASH',
                        tag: "Account Creation"
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
    channel.response(MessageAPI.GET_CHAIN, async (msg, res) => {
        try {
            const hash = msg.payload;
            const chain: IChainItem[] = [];
            let root: VcDocument | VpDocument;

            root = await vcDocumentRepository.findOne({ where: { hash: { $eq: hash } } });
            if (root) {
                const policyId = root.policyId;
                await getParents(chain, root, {}, policyId);
                await getPolicyInfo(chain, policyId);
                res.send(chain);
                return;
            }

            root = await vpDocumentRepository.findOne({ where: { hash: { $eq: hash } } });
            if (root) {
                const policyId = root.policyId;
                chain.push({
                    type: 'VP',
                    id: root.hash,
                    document: root.document,
                    owner: root.owner,
                    schema: 'VerifiablePresentation',
                    label: 'HASH',
                    tag: root.tag
                });
                const vpDocument = HcsVpDocument.fromJsonTree(root.document);
                const vcpDocument = vpDocument.getVerifiableCredential()[0];
                const hashVc = vcpDocument.toCredentialHash();
                const vc = await vcDocumentRepository.findOne({ where: { hash: { $eq: hashVc } } });
                await getParents(chain, vc, {}, policyId);
                await getPolicyInfo(chain, policyId);
                res.send(chain);
                return;
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
                    tag: root.tag
                });
                const vpDocument = HcsVpDocument.fromJsonTree(root.document);
                const vcpDocument = vpDocument.getVerifiableCredential()[0];
                const hashVc = vcpDocument.toCredentialHash();
                const vc = await vcDocumentRepository.findOne({ where: { hash: { $eq: hashVc } } });
                await getParents(chain, vc, {}, policyId);
                await getPolicyInfo(chain, policyId);
                res.send(chain);
                return;
            }

            await getPolicyInfo(chain, null);
            res.send(chain);
        } catch (error) {
            console.error(error);
            res.send(null);
        }
    });
}
