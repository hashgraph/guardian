import { IVCDocument, MessageAPI, PolicyStatus, } from '@guardian/interfaces';
import { ApiResponse } from '../api/helpers/api-response.js';
import { DatabaseServer, IAuthUser, MessageError, MessageResponse, Policy, VcDocument, VpDocument } from '@guardian/common';
import type { FindOptions } from '@mikro-orm/core/drivers/IDatabaseDriver';

/**
 * Connect to the message broker methods of working with VC, VP and DID Documents
 *
 * @param dataBaseServer - Data base server
 */
export async function documentsAPI(
    dataBaseServer: DatabaseServer,
): Promise<void> {
    /**
     * Return VC Documents
     *
     * @param {Object} [payload] - filters
     * @param {string} [payload.type] - filter by type
     * @param {string} [payload.owner] - filter by owner
     *
     * @returns {IVCDocument[]} - VC Documents
     */
    ApiResponse(MessageAPI.GET_VC_DOCUMENTS, async (msg: {
        user: IAuthUser,
        params: any
    }) => {
        try {
            if (msg) {
                const { params } = msg;
                const reqObj: any = {};
                const { owner, type, ...otherArgs } = params;
                if (owner) {
                    reqObj.owner = { $eq: owner }
                }
                if (type) {
                    reqObj.type = { $eq: type }
                }
                Object.assign(reqObj, otherArgs);
                const vcDocuments: IVCDocument[] = await dataBaseServer.find(VcDocument, reqObj);
                return new MessageResponse(vcDocuments);
            } else {
                const vcDocuments: IVCDocument[] = await dataBaseServer.findAll(VcDocument);
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
    ApiResponse(MessageAPI.GET_VP_DOCUMENTS, async (msg: {
        user: IAuthUser,
        params: any
    }) => {
        if (msg) {
            const { params } = msg;
            const { filters, pageIndex, pageSize } = params;
            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            }
            if (filters?.policyOwner) {
                const policies = await dataBaseServer.find(Policy, {
                    owner: filters.policyOwner,
                    status: PolicyStatus.PUBLISH
                }, {
                    fields: ['id', 'owner']
                });
                if (policies && policies.length) {
                    const policyIds = policies.map(p => p.id.toString());
                    const [items, count] = await dataBaseServer.findAndCount(VpDocument, { policyId: { $in: policyIds } }, otherOptions);
                    return new MessageResponse({ items, count });
                } else {
                    return new MessageResponse({ items: [], count: 0 });
                }
            } else {
                const [items, count] = await dataBaseServer.findAndCount(VpDocument, filters, otherOptions);
                return new MessageResponse({ items, count });
            }
        } else {
            const [items, count] = await dataBaseServer.findAndCount(VpDocument, null, {
                limit: 100,
                orderBy: { createDate: 'DESC' }
            } as FindOptions<object>);
            return new MessageResponse({ items, count });
        }
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
    ApiResponse(MessageAPI.GET_RELAYER_ACCOUNT_RELATIONSHIPS, async (msg: {
        user: IAuthUser,
        relayerAccountId: string,
        filters: {
            pageIndex?: any,
            pageSize?: any
        }
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid parameters.');
            }
            const { user, relayerAccountId, filters } = msg;
            if (!relayerAccountId) {
                return new MessageResponse({ items: [], count: 0 });
            }

            const { pageIndex, pageSize } = filters;
            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = 100;
            }
            const [items, count] = await dataBaseServer.findAndCount(VcDocument, {
                owner: user.did,
                relayerAccount: relayerAccountId
            }, otherOptions);

            for (const item of items) {
                const policy = await dataBaseServer.getPolicy(item.policyId, { fields: ['name'] } as any);
                (item as any).policyName = policy?.name;
                (item as any).policyVersion = policy?.version;

                const schema = await dataBaseServer.getSchemaByIRI(item.schema, policy?.topicId, { fields: ['name'] } as any);
                (item as any).schemaName = schema?.name;
            }

            return new MessageResponse({ items, count });
        }
        catch (error) {
            return new MessageError(error);
        }
    });
}
