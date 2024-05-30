import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
} from '@indexer/common';

@Controller()
export class FiltersService {
    @MessagePattern(IndexerMessageAPI.GET_VC_FILTERS)
    async getVcFilters() {
        try {
            return new MessageResponse(null);
        } catch (error) {
            return new MessageError(error);
        }
    }
}
