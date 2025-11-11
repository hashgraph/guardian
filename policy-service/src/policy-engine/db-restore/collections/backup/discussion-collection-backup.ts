import { DataBaseHelper, DeleteCache, PolicyDiscussion } from '@guardian/common';
import { FindCursor } from 'mongodb';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class PolicyDiscussionCollectionBackup extends CollectionBackup<PolicyDiscussion> {
    private readonly collectionName: string = 'PolicyDiscussion';

    protected override async findDocument(row: PolicyDiscussion): Promise<PolicyDiscussion> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<PolicyDiscussion> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRows = vcCollection.find<any>({ policyId: this.policyId });
        return vcRows;
    }

    protected override findDeletedDocuments(): FindCursor<DeleteCache> {
        const collection = DataBaseHelper.orm.em.getCollection('DeleteCache');
        const rows = collection.find<any>({
            policyId: this.policyId,
            collection: this.collectionName
        });
        return rows;
    }

    protected override createBackupData(row: PolicyDiscussion): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: PolicyDiscussion, oldRow?: PolicyDiscussion): any {
        const diff: any = this.compareData(newRow, oldRow);
        delete diff.documentFileId;
        delete diff.encryptedDocumentFileId;
        return diff;
    }

    protected override checkDocument(newRow: PolicyDiscussion, oldRow: PolicyDiscussion): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: PolicyDiscussion, oldRow?: PolicyDiscussion): boolean {
        return (!oldRow) || (newRow._docHash !== oldRow._docHash);
    }

    private prepareRow(row: PolicyDiscussion): PolicyDiscussion {
        const keys: string[] = [
            '_id',
            '_restoreId',
            '_docHash',
            '_propHash',
            'id',
            'uuid',
            'policyId',
            'targetId',
            'target',
            'count',
            'messageId',
            'encryptedDocument',
            'hash',
            'owner',
            'creator'
        ];
        for (const key of Object.keys(row)) {
            if (!keys.includes(key)) {
                delete row[key];
            }
        }
        return row;
    }

    protected override async loadFile(row: PolicyDiscussion, i: number = 0): Promise<PolicyDiscussion> {
        try {
            if (i > 10) {
                console.error('Load file error');
                return this.prepareRow(row);
            }
            if (row.encryptedDocumentFileId) {
                const buffer = await DataBaseHelper.loadFile(row.encryptedDocumentFileId);
                if (buffer) {
                    (row as any).encryptedDocument = buffer.toString('base64');
                }
            }
            return this.prepareRow(row);
        } catch (error) {
            const newRow = await this.findDocument(row);
            return await this.loadFile(newRow, i + 1);
        }
    }

    protected override async clearFile(row: PolicyDiscussion): Promise<PolicyDiscussion> {
        delete row.document;
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<PolicyDiscussion>, row?: PolicyDiscussion): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
