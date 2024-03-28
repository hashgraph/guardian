import { Controller, Module } from '@nestjs/common';
import { Client, ClientProxy, MessagePattern, Payload, Transport, } from '@nestjs/microservices';
import process from 'process';
import { IndexerMessageAPI, MessageResponse, MessageError } from '@indexer/common';

@Controller()
export class ApiService {
    @Client({
        transport: Transport.NATS,
        options: {
            servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
        },
    })
    client: ClientProxy;

    /**
     * Get all notifications
     * @param msg options
     * @returns Notifications and count
     */
    @MessagePattern(IndexerMessageAPI.GET_INDEXER_WORKER_STATUS)
    async getAll(
        @Payload()
        msg: {
            userId: string;
            pageIndex: number;
            pageSize: number;
        }
    ) {
        try {
            return new MessageResponse('');
        } catch (error) {
            return new MessageError(error);
        }
    }
}

/**
 * Channel module
 */
@Module({
    controllers: [ApiService],
})
export class ChannelModule { }
