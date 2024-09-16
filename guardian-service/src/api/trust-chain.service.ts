import { IChainItem, MessageAPI, SchemaEntity } from '@guardian/interfaces';
import { ApiResponse } from '../api/helpers/api-response.js';
import { DatabaseServer, DidDocument, MessageError, MessageResponse, PinoLogger, VcDocument, VpDocument, VpDocumentDefinition as HVpDocument } from '@guardian/common';
import { FilterQuery } from '@mikro-orm/core';

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
 * @param dataBaseServer - Data base server
 * @param logger - pino logger
 */
export async function trustChainAPI(
    dataBaseServer: DatabaseServer,
    logger: PinoLogger,
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

        const didDocuments = await dataBaseServer.find(DidDocument, { did: { $eq: issuer } });

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

        let parents = await dataBaseServer.find(VcDocument, {
            'document.credentialSubject.id': { $eq: issuer }
        } as FilterQuery<VcDocument>);

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

            const policyCreated = await dataBaseServer.findOne(VcDocument, {
                type: { $eq: SchemaEntity.POLICY },
                policyId: { $eq: policyId }
            });

            const policyImported = await dataBaseServer.findOne(VcDocument, {
                type: { $eq: 'POLICY_IMPORTED' },
                policyId: { $eq: policyId }
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
                const didDocuments = await dataBaseServer.find(DidDocument, { did: { $eq: issuer } });
                const standardRegistries = await dataBaseServer.find(VcDocument, {
                    type: { $eq: SchemaEntity.STANDARD_REGISTRY },
                    owner: { $eq: issuer }
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

            root = await dataBaseServer.findOne(VcDocument, { hash });
            if (root) {
                const policyId = root.policyId;
                await getParents(chain, root, {}, policyId);
                await getPolicyInfo(chain, policyId);
                return new MessageResponse(chain);
            }

            root = await dataBaseServer.findOne(VpDocument, { hash });
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
                const vc = await dataBaseServer.findOne(VcDocument, { hash: hashVc });
                await getParents(chain, vc, {}, policyId);
                await getPolicyInfo(chain, policyId);
                return new MessageResponse(chain);
            }

            root = await dataBaseServer.findOne(VpDocument, { 'document.id': { $eq: hash } } as FilterQuery<VpDocument>);

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
                const vc = await dataBaseServer.findOne(VcDocument, { hash: hashVc, policyId });
                await getParents(chain, vc, {}, policyId);
                await getPolicyInfo(chain, policyId);
                return new MessageResponse(chain);
            }

            await getPolicyInfo(chain, null);
            return new MessageResponse(chain);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error);
        }
    });
}
