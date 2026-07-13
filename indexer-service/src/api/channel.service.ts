import { Controller, Inject } from '@nestjs/common';
import {
    ClientProxy,
    EventPattern,
} from '@nestjs/microservices';
import process from 'node:process';
import {
    IndexerMessageAPI,
    Utils,
} from '@indexer/common';

@Controller()
export class ChannelService {
    private readonly STATUS_DELAY: number = 1000;
    private readonly status: string = 'STARTED';
    private readonly id: string;
    private readonly name: string;

    constructor(@Inject('INDEXER_API') private readonly client: ClientProxy) {
        this.id = Utils.GenerateUUIDv4();
        this.name = process.env.SERVICE_CHANNEL;
        setInterval(() => {
            const status = {
                id: this.id,
                name: this.name,
                status: this.status,
                delay: this.STATUS_DELAY,
            };
            this.client.emit(IndexerMessageAPI.INDEXER_STATUS, status);
        }, this.STATUS_DELAY);
    }

    /**
     * Get all statuses
     */
    @EventPattern(IndexerMessageAPI.GET_INDEXER_STATUS)
    async updateStatuses() {
        const status = {
            id: this.id,
            name: this.name,
            status: this.status,
            delay: this.STATUS_DELAY,
        };
        this.client.emit(IndexerMessageAPI.INDEXER_STATUS, status);
    }
}
