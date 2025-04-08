import { DataBaseHelper, DatabaseServer, Policy, PolicyDiff } from '@guardian/common';
import { IPolicyDiff } from './index.js';
import { FileHelper } from './file-helper.js';
import {
    VcCollectionRestore,
    VpCollectionRestore,
    DidCollectionRestore,
    StateCollectionRestore,
    RoleCollectionRestore,
    MultiDocCollectionRestore,
    TokenCollectionRestore,
    TagCollectionRestore,
    DocStateCollectionRestore,
    TopicCollectionRestore,
    ExternalCollectionRestore,
    ApproveCollectionRestore,
} from './collections/index.js';

export class PolicyRestore {
    private readonly policyId: string;
    private readonly vcRestore: VcCollectionRestore;
    private readonly vpRestore: VpCollectionRestore;
    private readonly didRestore: DidCollectionRestore;
    private readonly stateRestore: StateCollectionRestore;
    private readonly roleRestore: RoleCollectionRestore;
    private readonly multiDocRestore: MultiDocCollectionRestore;
    private readonly tokenRestore: TokenCollectionRestore;
    private readonly tagRestore: TagCollectionRestore;
    private readonly docStateRestore: DocStateCollectionRestore;
    private readonly topicRestore: TopicCollectionRestore;
    private readonly externalDocRestore: ExternalCollectionRestore;
    private readonly approveRestore: ApproveCollectionRestore;

    private lastDiff: PolicyDiff | null;

    constructor(policyId: string) {
        this.policyId = policyId;
        this.lastDiff = null;

        this.vcRestore = new VcCollectionRestore(this.policyId);
        this.vpRestore = new VpCollectionRestore(this.policyId);
        this.didRestore = new DidCollectionRestore(this.policyId);
        this.stateRestore = new StateCollectionRestore(this.policyId);
        this.roleRestore = new RoleCollectionRestore(this.policyId);
        this.multiDocRestore = new MultiDocCollectionRestore(this.policyId);
        this.tokenRestore = new TokenCollectionRestore(this.policyId);
        this.tagRestore = new TagCollectionRestore(this.policyId);
        this.docStateRestore = new DocStateCollectionRestore(this.policyId);
        this.topicRestore = new TopicCollectionRestore(this.policyId);
        this.externalDocRestore = new ExternalCollectionRestore(this.policyId);
        this.approveRestore = new ApproveCollectionRestore(this.policyId);
    }

    public async init(): Promise<void> {
        console.log('-- init')
        const policy = await DatabaseServer.getPolicyById(this.policyId);
        if (policy) {
            await this._loadBackup(policy);
        } else {
            throw Error('Invalid policy');
        }
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
        const oldDiff: IPolicyDiff = this.lastDiff.file || {};

        oldDiff.uuid = backup.uuid;
        oldDiff.index = backup.index;
        oldDiff.lastUpdate = backup.lastUpdate;
        oldDiff.vcCollection = await this.vcRestore.restoreBackup(backup.vcCollection);
        oldDiff.vpCollection = await this.vpRestore.restoreBackup(backup.vpCollection);
        oldDiff.didCollection = await this.didRestore.restoreBackup(backup.didCollection);
        oldDiff.stateCollection = await this.stateRestore.restoreBackup(backup.stateCollection);
        oldDiff.roleCollection = await this.roleRestore.restoreBackup(backup.roleCollection);
        oldDiff.multiDocCollection = await this.multiDocRestore.restoreBackup(backup.multiDocCollection);
        oldDiff.tokenCollection = await this.tokenRestore.restoreBackup(backup.tokenCollection);
        oldDiff.tagCollection = await this.tagRestore.restoreBackup(backup.tagCollection);
        oldDiff.docStateCollection = await this.docStateRestore.restoreBackup(backup.docStateCollection);
        oldDiff.topicCollection = await this.topicRestore.restoreBackup(backup.topicCollection);
        oldDiff.externalDocCollection = await this.externalDocRestore.restoreBackup(backup.externalDocCollection);
        oldDiff.approveCollection = await this.approveRestore.restoreBackup(backup.approveCollection);

        await this._saveBackup(oldDiff);
    }

    private async _restoreDiff(diff: IPolicyDiff): Promise<void> {
        console.log('-- _restoreDiff');
        const oldDiff: IPolicyDiff = this.lastDiff.file || {};

        oldDiff.uuid = diff.uuid;
        oldDiff.index = diff.index;
        oldDiff.lastUpdate = diff.lastUpdate;
        oldDiff.vcCollection = await this.vcRestore.restoreDiff(diff.vcCollection, oldDiff.vcCollection);
        oldDiff.vpCollection = await this.vpRestore.restoreDiff(diff.vpCollection, oldDiff.vpCollection);
        oldDiff.didCollection = await this.didRestore.restoreDiff(diff.didCollection, oldDiff.didCollection);
        oldDiff.stateCollection = await this.stateRestore.restoreDiff(diff.stateCollection, oldDiff.stateCollection);
        oldDiff.roleCollection = await this.roleRestore.restoreDiff(diff.roleCollection, oldDiff.roleCollection);
        oldDiff.multiDocCollection = await this.multiDocRestore.restoreDiff(diff.multiDocCollection, oldDiff.multiDocCollection);
        oldDiff.tokenCollection = await this.tokenRestore.restoreDiff(diff.tokenCollection, oldDiff.tokenCollection);
        oldDiff.tagCollection = await this.tagRestore.restoreDiff(diff.tagCollection, oldDiff.tagCollection);
        oldDiff.docStateCollection = await this.docStateRestore.restoreDiff(diff.docStateCollection, oldDiff.docStateCollection);
        oldDiff.topicCollection = await this.topicRestore.restoreDiff(diff.topicCollection, oldDiff.topicCollection);
        oldDiff.externalDocCollection = await this.externalDocRestore.restoreDiff(diff.externalDocCollection, oldDiff.externalDocCollection);
        oldDiff.approveCollection = await this.approveRestore.restoreDiff(diff.approveCollection, oldDiff.approveCollection);

        await this._saveBackup(oldDiff);
    }

    private async _loadBackup(policy: Policy) {
        const collection = DataBaseHelper.orm.em.getCollection<PolicyDiff>('PolicyDiff');
        let row = await collection.findOne<PolicyDiff>({ policyId: this.policyId });
        if (!row) {
            const record = await collection.insertOne({
                policyId: this.policyId,
                policyTopicId: policy.topicId,
                instanceTopicId: policy.instanceTopicId,
                restoreTopicId: policy.restoreTopicId,
                type: 'restore',
                valid: true
            } as any);
            row = await collection.findOne<PolicyDiff>({ _id: record.insertedId });
        }
        if (row?.fileId) {
            row.file = await FileHelper.loadFile(row.fileId);
        }
        this.lastDiff = row;
        console.log('-- _loadBackup (r)')
        // console.log(JSON.stringify(this.lastDiff))
    }

    private async _saveBackup(backup: IPolicyDiff) {
        const valid = (
            !!backup.vcCollection &&
            !!backup.vpCollection &&
            !!backup.didCollection &&
            !!backup.stateCollection &&
            !!backup.roleCollection &&
            !!backup.multiDocCollection &&
            !!backup.tokenCollection &&
            !!backup.tagCollection &&
            !!backup.docStateCollection &&
            !!backup.topicCollection &&
            !!backup.externalDocCollection &&
            !!backup.approveCollection
        )

        const fileId = await FileHelper.saveFile(backup);
        const lastUpdate = backup.lastUpdate;
        const collection = DataBaseHelper.orm.em.getCollection<PolicyDiff>('PolicyDiff');
        collection.updateOne(
            { _id: this.lastDiff._id },
            { $set: { lastUpdate, fileId, valid } }
        )
        await FileHelper.deleteFile(this.lastDiff.fileId);

        this.lastDiff.fileId = fileId;
        this.lastDiff.lastUpdate = lastUpdate;
        this.lastDiff.file = backup;
        this.lastDiff.valid = valid;
    }
}