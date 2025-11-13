import { DataBaseHelper, Topic } from '@guardian/common';
import { CollectionRestore, IDiffAction } from '../../index.js';

export class TopicCollectionRestore extends CollectionRestore<Topic> {
    protected override actionHash(hash: string, action: IDiffAction<Topic>, row?: Topic): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: Topic[]): Promise<void> {
        const collection = new DataBaseHelper(Topic);
        await collection.insertOrUpdate(rows as Topic[], 'topicId');
    }

    protected override async updateDocuments(rows: Topic[]): Promise<void> {
        const collection = new DataBaseHelper(Topic);
        await collection.insertOrUpdate(rows as Topic[], 'topicId');
    }

    protected override async deleteDocuments(rows: Topic[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const collection = new DataBaseHelper(Topic);
        await collection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: Topic, id: string): Topic {
        return data;
    }

    protected override async decryptRow(row: Topic, id: string): Promise<Topic> {
        return row;
    }
}
