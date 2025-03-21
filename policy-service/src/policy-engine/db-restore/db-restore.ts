import { DataBaseHelper, Policy, PolicyDiff } from '@guardian/common';
import { ICollectionDiff, IPolicyDiff, Row, VcCollectionRestore } from './index.js';
import { ObjectId } from 'mongodb';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { FileHelper } from './file-helper.js';

export class PolicyRestore {
    private readonly policyId: string;
    private readonly vcRestore: VcCollectionRestore;
    private lastDiff: PolicyDiff | null;

    constructor(policyId: string) {
        this.policyId = policyId;
        this.lastDiff = null;

        this.vcRestore = new VcCollectionRestore(this.policyId);
    }

    public async init(): Promise<void> {
        console.log('-- init')
    }

    public async restore(file: string): Promise<void> {
        console.log('-- restore')
        const diff = FileHelper.decryptFile(file);


        if (diff.type === 'backup') {
            await this._restoreBackup(diff);
        } else {
            await this._restoreDiff(diff);
        }
    }

    private async _restoreBackup(backup: IPolicyDiff): Promise<void> {
        console.log('-- _restoreBackup');

        await this.vcRestore.restoreBackup(backup.vcCollection);
    }

    private async _restoreDiff(diff: IPolicyDiff): Promise<void> {
        console.log('-- _restoreDiff');

        await this.vcRestore.restoreDiff(diff.vcCollection);
    }
}