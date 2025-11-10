import { DataBaseHelper, DeleteCache, PolicyComment } from '@guardian/common';
import { FindCursor } from 'mongodb';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';

export class PolicyCommentCollectionBackup extends CollectionBackup<PolicyComment> {
    private readonly collectionName: string = 'PolicyComment';

    protected override async findDocument(row: PolicyComment): Promise<PolicyComment> {
        const vcCollection = DataBaseHelper.orm.em.getCollection(this.collectionName);
        const vcRow = await vcCollection.findOne<any>({ policyId: this.policyId, _id: row._id });
        return vcRow;
    }

    protected override findDocuments(lastUpdate?: Date): FindCursor<PolicyComment> {
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

    protected override createBackupData(row: PolicyComment): any {
        return {
            _propHash: row._propHash,
            _docHash: row._docHash
        }
    }

    protected override createDiffData(newRow: PolicyComment, oldRow?: PolicyComment): any {
        const diff: any = this.compareData(newRow, oldRow);
        delete diff.documentFileId;
        delete diff.encryptedDocumentFileId;
        return diff;
    }

    protected override checkDocument(newRow: PolicyComment, oldRow: PolicyComment): boolean {
        return (newRow._docHash !== oldRow._docHash) || (newRow._propHash !== oldRow._propHash);
    }

    protected override needLoadFile(newRow: PolicyComment, oldRow?: PolicyComment): boolean {
        return (!oldRow) || (newRow._docHash !== oldRow._docHash);
    }

    private prepareRow(row: PolicyComment): PolicyComment {
        return {
            _id: row._id,
            _restoreId: row._restoreId,
            _docHash: row._docHash,
            _propHash: row._propHash,
            id: row.id,
            topicId: row.topicId,
            policyId: row.policyId,
            policyTopicId: row.policyTopicId,
            policyInstanceTopicId: row.policyInstanceTopicId,
            targetId: row.targetId,
            target: row.target,
            discussionId: row.discussionId,
            discussionMessageId: row.discussionMessageId,
            messageId: row.messageId,
        } as any
    }

    protected override async loadFile(row: PolicyComment, i: number = 0): Promise<PolicyComment> {
        try {
            row = this.prepareRow(row);
            if (i > 10) {
                console.error('Load file error');
                return row;
            }
            // delete row.document;
            // delete row.encryptedDocument;
            // if (row.encryptedDocumentFileId) {
            //     const buffer = await DataBaseHelper.loadFile(row.encryptedDocumentFileId);
            //     if (buffer) {
            //         (row as any).encryptedDocument = buffer.toString('base64');
            //     }
            // } else if (row.documentFileId) {
            //     const buffer = await DataBaseHelper.loadFile(row.documentFileId);
            //     if (buffer) {
            //         (row as any).document = buffer.toString('base64');
            //     }
            // }
            return row;
        } catch (error) {
            const newRow = await this.findDocument(row);
            return await this.loadFile(newRow, i + 1);
        }
    }

    protected override async clearFile(row: PolicyComment): Promise<PolicyComment> {
        delete row.document;
        return row;
    }

    protected override actionHash(hash: string, action: IDiffAction<PolicyComment>, row?: PolicyComment): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }
}
