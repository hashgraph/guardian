import { Client, ClientOptions } from '@elastic/elasticsearch';
import { ElasticItem } from './elastic-item.interface';
import { ElasticDocument } from './elastic-document.interface';
import { ElasticResponse } from './elastic-response.interface';

export class ElasticHelper {
    public readonly indexes: Set<string>;
    public readonly client: Client;

    constructor(opts: ClientOptions) {
        this.indexes = new Set<string>();
        this.client = new Client(opts);
    }

    public getIndexName(value: any): string {
        return String((value || '') + '-messages').toLowerCase().replaceAll(' ', '-');
    }

    public async getIndex(value: any): Promise<string> {
        const index = this.getIndexName(value);
        if (this.indexes.has(index)) {
            return index;
        }
        const exists = await this.client.indices.exists({ index });
        if (!exists) {
            await this.client.indices.create({ index });
        }
        this.indexes.add(index);
        return index;
    }

    public async insert(dataset: ElasticItem[]): Promise<ElasticResponse[]> {
        const operations = dataset.flatMap(doc => [
            { index: { _index: doc.index }, id: doc.document.id },
            doc.document
        ]);
        const bulkResponse = await this.client.bulk({ refresh: true, operations });
        const result: ElasticResponse[] = [];
        for (let i = 0; i < bulkResponse.items.length; i++) {
            const log = bulkResponse.items[i];
            const document = operations[i * 2 + 1] as ElasticDocument;
            const operation = Object.keys(log)[0];
            const action = log[operation];
            if (action.error) {
                result.push({
                    id: document.id,
                    status: action.status,
                    error: action.error,
                });
            } else {
                result.push({
                    id: document.id,
                    status: 200,
                    error: null,
                });
            }
        }
        return result;
    }

    public async close(): Promise<void> {
        await this.client.close();
    }
}