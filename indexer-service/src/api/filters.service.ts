import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    AnyResponse,
    IPage,
    IResults,
    DataBaseHelper,
    MessageCache,
    DataBaseUtils,
    TopicCache,
    Message,
    TokenCache,
    NftCache,
    MessageType
} from '@indexer/common';

@Controller()
export class FiltersService {
    /**
     * Get vp filters
     * @param msg options
     */
    @MessagePattern(IndexerMessageAPI.GET_VP_FILTERS)
    async getVpFilters() {
        try {
            const filters = [];
            //Policies
            const em = DataBaseHelper.getEntityManager();
            const policies = await em.find(Message, { type: MessageType.INSTANCE_POLICY });
            filters.push({
                field: 'policy',
                data: policies.map((policy) => {
                    return {
                        label: policy.options.name,
                        version: policy.options.version,
                        value: policy.options.instanceTopicId
                    }
                })
            });
            //Schemas
            // const schemas = await em.find(Message, { type: MessageType.SCHEMA });
            // filters.push({
            //     field: 'schema',
            //     data: schemas.map((schema) => {
            //         return {
            //             label: schema.options.name,
            //             version: schema.options.version,
            //             value: schema.options.uuid
            //         }
            //     })
            // });
            //Status
            filters.push({
                field: 'status',
                data: [{
                    label: 'ISSUE',
                    value: 'ISSUE',
                }, {
                    label: 'REVOKE',
                    value: 'REVOKE',
                }]
            });
            return new MessageResponse<any>(filters);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Get vc filters
     * @param msg options
     */
    @MessagePattern(IndexerMessageAPI.GET_VC_FILTERS)
    async getVcFilters() {
        try {
            return new MessageResponse<any>(null);
        } catch (error) {
            return new MessageError(error);
        }
    }
}