import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AnyResponse, IndexerMessageAPI, responseFrom } from '@indexer/common';

export class ApiClient {
    constructor(
        @Inject('INDEXER_API') protected readonly client: ClientProxy
    ) {}

    protected async send<T>(api: IndexerMessageAPI, body: any): Promise<T> {
        const result = await firstValueFrom(
            this.client.send<AnyResponse<T>>(api, body)
        );
        return responseFrom(result);
    }
}
