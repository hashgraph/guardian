import { DataBaseHelper, Policy, PolicyDiff } from '@guardian/common';
import { IPolicyDiff, VcCollectionBackup } from './index.js';
import { ObjectId } from 'mongodb';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { FileHelper } from './file-helper.js';

export class PolicyBackup {
    private readonly policyId: string;
    private readonly vcBackup: VcCollectionBackup;
    private lastDiff: PolicyDiff | null;

    constructor(policyId: string) {
        this.policyId = policyId;
        this.lastDiff = null;

        this.vcBackup = new VcCollectionBackup(this.policyId);
    }

    public async init(): Promise<void> {
        console.log('-- init')

        const policyCollection = DataBaseHelper.orm.em.getCollection<Policy>('Policy');
        const policy = await policyCollection.findOne<any>({ _id: new ObjectId(this.policyId) });
        if (policy) {
            await this._loadBackup(policy);
        } else {
            // throw Error('Invalid policy');
            console.log('-- Invalid policy')
            return;
        }
    }

    public async save(full = false): Promise<void> {
        if (this.lastDiff.file && !full) {
            const { backup, diff } = await this._createDiff(this.lastDiff.file);
            await this._sendDiff(diff);
            await this._saveBackup(backup)
        } else {
            const { backup, diff } = await this._createFullBackup();
            await this._sendDiff(diff);
            await this._saveBackup(backup);
        }
    }

    private async _createFullBackup(): Promise<{ backup: IPolicyDiff, diff: IPolicyDiff }> {
        console.log('-- _createFullBackup')
        const lastUpdate = new Date();
        const vcResult = await this.vcBackup.createCollectionBackup();
        const backup: IPolicyDiff = {
            type: 'backup',
            lastUpdate,
            vcCollection: vcResult.backup
        }
        const diff: IPolicyDiff = {
            type: 'backup',
            lastUpdate,
            vcCollection: vcResult.diff
        }
        console.log(JSON.stringify(backup))
        console.log(JSON.stringify(diff))
        return { backup, diff };
    }

    private async _createDiff(oldDiff: IPolicyDiff): Promise<{ backup: IPolicyDiff, diff: IPolicyDiff }> {
        console.log('-- _createDiff')
        const lastUpdate = new Date();
        const vcResult = await this.vcBackup.createCollectionDiff(oldDiff.vcCollection, lastUpdate);
        const backup: IPolicyDiff = {
            type: 'backup',
            lastUpdate,
            vcCollection: vcResult.backup
        }
        const diff: IPolicyDiff = {
            type: 'diff',
            lastUpdate,
            vcCollection: vcResult.diff
        }
        console.log(JSON.stringify(backup))
        console.log(JSON.stringify(diff))
        return { backup, diff };
    }

    private async _loadBackup(policy: Policy) {
        const collection = DataBaseHelper.orm.em.getCollection<PolicyDiff>('PolicyDiff');
        let row = await collection.findOne<PolicyDiff>({ policyId: this.policyId });
        if (!row) {
            const record = await collection.insertOne({
                policyId: this.policyId,
                policyTopicId: policy.topicId,
                instanceTopicId: policy.instanceTopicId,
                diffTopicId: '',
            } as any);
            row = await collection.findOne<PolicyDiff>({ _id: record.insertedId });
        }
        if (row?.fileId) {
            row.file = await this._loadFile(row.fileId);
        }
        this.lastDiff = row;
        console.log('-- _loadBackup')
        console.log(JSON.stringify(this.lastDiff))
    }

    private async _saveBackup(backup: IPolicyDiff) {
        const fileId = await this._saveFile(backup);
        const lastUpdate = backup.lastUpdate;
        const collection = DataBaseHelper.orm.em.getCollection<PolicyDiff>('PolicyDiff');
        collection.updateOne(
            { _id: this.lastDiff._id },
            { $set: { lastUpdate, fileId } }
        )
        await this._deleteFile(this.lastDiff.fileId);

        this.lastDiff.fileId = fileId;
        this.lastDiff.lastUpdate = lastUpdate;
        this.lastDiff.file = backup;
    }

    private async _loadFile(id: ObjectId): Promise<IPolicyDiff | null> {
        if (!id) {
            return null;
        }
        const buffer = await DataBaseHelper.loadFile(id);
        if (!buffer) {
            return null;
        }
        const file = buffer.toString();
        const diff = FileHelper.decryptFile(file);
        return diff;
    }

    private async _saveFile(diff: IPolicyDiff): Promise<ObjectId> {
        const file = FileHelper.encryptFile(diff);
        const buffer = Buffer.from(file);
        const id = await DataBaseHelper.saveFile(GenerateUUIDv4(), buffer);
        return id;
    }

    private async _deleteFile(id: ObjectId): Promise<void> {
    }

    private async _sendDiff(diff: IPolicyDiff) {
        console.log('-- _sendDiff')
        const file = FileHelper.encryptFile(diff);
        console.log(file)
    }
}