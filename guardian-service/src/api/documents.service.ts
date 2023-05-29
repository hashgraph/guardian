import { IDidObject, IVCDocument, MessageAPI, PolicyType, } from '@guardian/interfaces';
import { ApiResponse } from '@api/helpers/api-response';
import { DataBaseHelper, DidDocument, MessageError, MessageResponse, Policy, VcDocument, VpDocument } from '@guardian/common';

/**
 * Connect to the message broker methods of working with VC, VP and DID Documents
 *
 * @param didDocumentRepository - table with DID Documents
 * @param vcDocumentRepository - table with VC Documents
 * @param vpDocumentRepository - table with VP Documents
 */
export async function documentsAPI(
    didDocumentRepository: DataBaseHelper<DidDocument>,
    vcDocumentRepository: DataBaseHelper<VcDocument>,
    vpDocumentRepository: DataBaseHelper<VpDocument>,
    policyRepository: DataBaseHelper<Policy>,
): Promise<void> {
    /**
     * Return DID Documents by DID
     *
     * @param {Object} payload - filters
     * @param {string} payload.did - DID
     *
     * @returns {IDidDocument[]} - DID Documents
     */
    ApiResponse(MessageAPI.GET_DID_DOCUMENTS, async (msg) => {
        const reqObj = { where: { did: { $eq: msg.did } } };
        const didDocuments: IDidObject[] = await didDocumentRepository.find(reqObj);
        return new MessageResponse(didDocuments);
    });

    /**
     * Return VC Documents
     *
     * @param {Object} [payload] - filters
     * @param {string} [payload.type] - filter by type
     * @param {string} [payload.owner] - filter by owner
     *
     * @returns {IVCDocument[]} - VC Documents
     */
    ApiResponse(MessageAPI.GET_VC_DOCUMENTS, async (msg) => {
        try {
            if (msg) {
                const reqObj: any = {};
                const { owner, type, ...otherArgs } = msg;
                if (owner) {
                    reqObj.owner = { $eq: owner }
                }
                if (type) {
                    reqObj.type = { $eq: type }
                }
                Object.assign(reqObj, otherArgs);
                const vcDocuments: IVCDocument[] = await vcDocumentRepository.find(reqObj);
                return new MessageResponse(vcDocuments);
            } else {
                const vcDocuments: IVCDocument[] = await vcDocumentRepository.findAll();
                return new MessageResponse(vcDocuments);
            }
        }
        catch (error) {
            return new MessageError(error);
        }
    });

    /**
     * Return VP Documents
     *
     * @param {Object} [payload] - filters
     *
     * @returns {IVPDocument[]} - VP Documents
     */
    ApiResponse(MessageAPI.GET_VP_DOCUMENTS, async (msg) => {
        if (msg) {
            const { filters, pageIndex, pageSize } = msg;
            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            }
            if (filters?.policyOwner) {
                const policies = await policyRepository.find({
                    owner: filters.policyOwner,
                    status: PolicyType.PUBLISH
                }, {
                    fields: ['id', 'owner']
                });
                if (policies && policies.length) {
                    const policyIds = policies.map(p => p.id.toString());
                    const [items, count] = await vpDocumentRepository.findAndCount({
                        where: {
                            policyId: { $in: policyIds }
                        }
                    }, otherOptions);
                    return new MessageResponse({ items, count });
                } else {
                    return new MessageResponse({ items: [], count: 0 });
                }
            } else {
                const [items, count] = await vpDocumentRepository.findAndCount(filters, otherOptions);
                return new MessageResponse({ items, count });
            }
        } else {
            const [items, count] = await vpDocumentRepository.findAndCount(null, {
                limit: 100,
                orderBy: { createDate: 'DESC' }
            });
            return new MessageResponse({ items, count });
        }
    });
}
