import { DataBaseHelper, VcDocument } from "@guardian/common";
import { CollectionRestore, IDiffAction, VC } from '../index.js';

export class VcCollectionRestore extends CollectionRestore<VC> {
    protected override actionHash(hash: string, action: IDiffAction<VC>, row?: VC): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: VC[]): Promise<void> {
        const vcCollection = new DataBaseHelper(VcDocument);
        await vcCollection.insertMany(rows as VcDocument[]);
    }

    protected override async updateDocuments(rows: VC[]): Promise<void> {
        const vcCollection = new DataBaseHelper(VcDocument);
        await vcCollection.updateByKey(rows as VcDocument[], '_restoreId');
    }

    protected override async deleteDocuments(rows: VC[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const vcCollection = new DataBaseHelper(VcDocument);
        await vcCollection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: any): VC {
        if (data.document) {
            const document = Buffer.from(data.document, 'base64').toString();
            data.document = JSON.parse(document);
        }
        return data;
    }
}
