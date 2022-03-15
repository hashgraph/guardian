import { DidDocument } from '@entity/did-document';
import { VcDocument } from '@entity/vc-document';
import { VpDocument } from '@entity/vp-document';
import { IChainItem, MessageAPI, MessageError, MessageResponse, SchemaEntity } from 'interfaces';
import { Logger } from 'logger-helper';
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
            entity: vc.type,
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
            entity: 'DID',
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
            let issuer: string;

            const policyCreated = await vcDocumentRepository.findOne({
                where: {
                    type: { $eq: SchemaEntity.POLICY },
                    policyId: { $eq: policyId }
                }
            });

            const policyImported = await vcDocumentRepository.findOne({
                where: {
                    type: { $eq: SchemaEntity.POLICY_IMPORTED },
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
                    tag: "Policy Created"
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
                    tag: "Policy Imported"
                });
            }
            
            if (issuer) {
                const didDocuments = await didDocumentRepository.find({ where: { did: { $eq: issuer } } });
                const rootAuthority = await vcDocumentRepository.findOne({
                    where: {
                        type: { $eq: SchemaEntity.ROOT_AUTHORITY },
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
                if (rootAuthority) {
                    chain.push({
                        type: 'VC',
                        id: rootAuthority.hash,
                        document: rootAuthority.document,
                        owner: rootAuthority.owner,
                        schema: getField(rootAuthority, 'type'),
                        label: 'HASH',
                        entity: 'RootAuthority',
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
                res.send(new MessageResponse(chain));
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
                    entity: 'VP',
                    tag: root.tag
                });
                const vpDocument = HcsVpDocument.fromJsonTree(root.document);
                const vcpDocument = vpDocument.getVerifiableCredential()[0];
                const hashVc = vcpDocument.toCredentialHash();
                const vc = await vcDocumentRepository.findOne({ where: { hash: { $eq: hashVc } } });
                await getParents(chain, vc, {}, policyId);
                await getPolicyInfo(chain, policyId);
                res.send(new MessageResponse(chain));
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
                    entity: 'VP',
                    tag: root.tag
                });
                const vpDocument = HcsVpDocument.fromJsonTree(root.document);
                const vcpDocument = vpDocument.getVerifiableCredential()[0];
                const hashVc = vcpDocument.toCredentialHash();
                const vc = await vcDocumentRepository.findOne({ where: { hash: { $eq: hashVc } } });
                await getParents(chain, vc, {}, policyId);
                await getPolicyInfo(chain, policyId);
                res.send(new MessageResponse(chain));
                return;
            }

            await getPolicyInfo(chain, null);
            res.send(new MessageResponse(chain));
        } catch (error) {
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            console.error(error);
            res.send(new MessageError(error.message));
        }
    });
}
