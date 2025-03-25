import { DataBaseHelper, PolicyRoles } from "@guardian/common";
import { CollectionRestore, IDiffAction } from '../../index.js';

export class RoleCollectionRestore extends CollectionRestore<PolicyRoles> {
    protected override actionHash(hash: string, action: IDiffAction<PolicyRoles>, row?: PolicyRoles): string {
        if (row) {
            return this.sumHash(hash, action.type, action.id, row._propHash, row._docHash);
        } else {
            return this.sumHash(hash, action.type, action.id);
        }
    }

    protected override clearCollection(): Promise<void> {
        return;
    }

    protected override async insertDocuments(rows: PolicyRoles[]): Promise<void> {
        const vcCollection = new DataBaseHelper(PolicyRoles);
        await vcCollection.insertMany(rows as PolicyRoles[]);
    }

    protected override async updateDocuments(rows: PolicyRoles[]): Promise<void> {
        const vcCollection = new DataBaseHelper(PolicyRoles);
        await vcCollection.updateByKey(rows as PolicyRoles[], '_restoreId');
    }

    protected override async deleteDocuments(rows: PolicyRoles[]): Promise<void> {
        const ids: string[] = rows.map(r => r._restoreId);
        const vcCollection = new DataBaseHelper(PolicyRoles);
        await vcCollection.delete({ _restoreId: { $in: ids } });
    }

    protected override createRow(data: PolicyRoles): PolicyRoles {
        return data;
    }
}
