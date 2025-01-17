import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AnyResponse, IndexerMessageAPI, responseFrom } from '@indexer/common';

export class ApiClient {
    constructor(
        @Inject('INDEXER_API') protected readonly client: ClientProxy
    ) { }

    protected async send<T>(api: IndexerMessageAPI, body: any): Promise<T> {
        const result = await firstValueFrom(
            this.client.send<AnyResponse<T>>(api, body)
        );
        try {
            return responseFrom(result);
        } catch (error) {
            if (typeof error === 'string') {
                throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                throw new HttpException(error.message, error.code);
            }
        }
    }
}
