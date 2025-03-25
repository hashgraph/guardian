import { DataBaseHelper, VpDocument } from "@guardian/common";
import { CollectionRestore, IDiffAction } from '../../index.js';

export class VpCollectionRestore extends CollectionRestore<VpDocument> {
    protected override actionHash(hash: string, action: IDiffAction<VpDocument>, row?: VpDocument): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: VpDocument[]): Promise<void> {
        const vcCollection = new DataBaseHelper(VpDocument);
        await vcCollection.insertMany(rows as VpDocument[]);
    }

    protected override async updateDocuments(rows: VpDocument[]): Promise<void> {
        const vcCollection = new DataBaseHelper(VpDocument);
        await vcCollection.updateByKey(rows as VpDocument[], '_restoreId');
    }

    protected override async deleteDocuments(rows: VpDocument[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const vcCollection = new DataBaseHelper(VpDocument);
        await vcCollection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: VpDocument): VpDocument {
        if (data.document) {
            const document = Buffer.from((data as any).document, 'base64').toString();
            data.document = JSON.parse(document);
        }
        return data;
    }
}
