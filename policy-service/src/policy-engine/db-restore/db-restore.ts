import { DataBaseHelper, Policy, PolicyDiff } from '@guardian/common';
import { ICollectionDiff, IPolicyDiff, Row, VcCollectionRestore } from './index.js';
import { ObjectId } from 'mongodb';
import { GenerateUUIDv4 } from '@guardian/interfaces';

export class PolicyRestore {
    private readonly policyId: string;
    private readonly vcRestore: VcCollectionRestore;
    private lastDiff: IPolicyDiff | null;

    constructor(policyId: string) {
        this.policyId = policyId;
        this.lastDiff = null;

        this.vcRestore = new VcCollectionRestore(this.policyId);
    }

    public async init(): Promise<void> {
        console.log('-- init')

        const policyCollection = DataBaseHelper.orm.em.getCollection<Policy>('Policy');
        const policy = await policyCollection.findOne<any>({ _id: new ObjectId(this.policyId) });
        if (!policy) {
            // throw Error('Invalid policy');
            console.log('-- Invalid policy')
            return;
        }

        const collection = DataBaseHelper.orm.em.getCollection<PolicyDiff>('PolicyDiff');
        this.lastDiff = await collection.findOne<PolicyDiff>({ policyId: this.policyId });
        if (!this.lastDiff) {
            const record = await collection.insertOne({
                policyId: this.policyId,
                policyTopicId: policy.topicId,
                instanceTopicId: policy.instanceTopicId,
                diffTopicId: '',
            } as any);
            this.lastDiff = await collection.findOne<PolicyDiff>({ _id: record.insertedId });
        }
        if (this.lastDiff) {
            this.lastDiff.vcCollection = await this._loadFile(this.lastDiff.vcCollectionId);
        }
        console.log(JSON.stringify(this.lastDiff))
    }

    public async save(full = false): Promise<IPolicyDiff> {
        if (this.lastDiff.lastUpdate && !full) {
            const { backup, diff } = await this._createDiff(this.lastDiff);
            await this._sendDiff(diff);
            await this._saveBackup(backup)
        } else {
            const { backup } = await this._createFullBackup();
            await this._sendBackup(backup);
            await this._saveBackup(backup);
        }
        return this.lastDiff;
    }

    private async _sendBackup(backup: IPolicyDiff) {
        console.log('-- _sendBackup')
        console.log(JSON.stringify(backup))
    }

    private async _sendDiff(diff: IPolicyDiff) {
        console.log('-- _sendDiff')
        console.log(JSON.stringify(diff))
    }

    private async _saveBackup(backup: IPolicyDiff) {
        backup.vcCollectionId = await this._saveFile(backup.vcCollection);

        const collection = DataBaseHelper.orm.em.getCollection<PolicyDiff>('PolicyDiff');
        collection.updateOne(
            { _id: this.lastDiff._id },
            {
                $set: {
                    lastUpdate: backup.lastUpdate,
                    vcCollectionId: backup.vcCollectionId
                }
            }
        )
        await this._deleteFile(this.lastDiff.vcCollectionId);

        this.lastDiff.lastUpdate = backup.lastUpdate;
        this.lastDiff.vcCollection = backup.vcCollection;
        this.lastDiff.vcCollectionId = backup.vcCollectionId;
    }

    private async _createFullBackup(): Promise<{ backup: IPolicyDiff }> {
        console.log('-- _createFullBackup')
        const lastUpdate = new Date();
        const vcDiff = await this.vcRestore.createCollectionBackup();
        const backup: IPolicyDiff = {
            lastUpdate,
            policyId: this.policyId,
            vcCollection: vcDiff
        }
        console.log(JSON.stringify(backup))
        return { backup };
    }

    private async _createDiff(oldDiff: IPolicyDiff): Promise<{ backup: IPolicyDiff, diff: IPolicyDiff }> {
        console.log('-- _createDiff')
        const lastUpdate = new Date();
        const vcResult = await this.vcRestore.createCollectionDiff(oldDiff.vcCollection, lastUpdate);


        const diff: IPolicyDiff = {
            lastUpdate,
            policyId: this.policyId,
            vcCollection: vcResult.diff
        }
        console.log(JSON.stringify(diff))

        const backup: IPolicyDiff = {
            lastUpdate,
            policyId: this.policyId,
            vcCollection: vcResult.backup
        }
        console.log(JSON.stringify(backup))
        return { backup, diff };
    }

    private async _loadFile<T extends Row>(id: ObjectId): Promise<ICollectionDiff<T> | null> {
        if (!id) {
            return null;
        }
        const buffer = await DataBaseHelper.loadFile(id);
        if (!buffer) {
            return null;
        }
        const file = buffer.toString();
        const diff = JSON.parse(file);
        return diff;
    }

    private async _saveFile<T extends Row>(diff: ICollectionDiff<T>): Promise<ObjectId> {
        const file = JSON.stringify(diff);
        const buffer = Buffer.from(file);
        const id = await DataBaseHelper.saveFile(GenerateUUIDv4(), buffer);
        return id;
    }

    private async _deleteFile(id: ObjectId): Promise<void> {
    }
}