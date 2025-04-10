import { DataBaseHelper, DatabaseServer, Policy, PolicyDiff } from '@guardian/common';
import { IPolicyDiff } from './index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { FileHelper } from './file-helper.js';
import {
    VcCollectionBackup,
    VpCollectionBackup,
    DidCollectionBackup,
    StateCollectionBackup,
    RoleCollectionBackup,
    MultiDocCollectionBackup,
    TokenCollectionBackup,
    TagCollectionBackup,
    DocStateCollectionBackup,
    TopicCollectionBackup,
    ExternalCollectionBackup,
    ApproveCollectionBackup,
    MintRequestCollectionBackup,
    MintTransactionCollectionBackup
} from './collections/index.js';

export class PolicyBackup {
    private readonly policyId: string;
    private readonly vcBackup: VcCollectionBackup;
    private readonly vpBackup: VpCollectionBackup;
    private readonly didBackup: DidCollectionBackup;
    private readonly stateBackup: StateCollectionBackup;
    private readonly roleBackup: RoleCollectionBackup;
    private readonly multiDocBackup: MultiDocCollectionBackup;
    private readonly tokenBackup: TokenCollectionBackup;
    private readonly tagBackup: TagCollectionBackup;
    private readonly docStateBackup: DocStateCollectionBackup;
    private readonly topicBackup: TopicCollectionBackup;
    private readonly externalDocBackup: ExternalCollectionBackup;
    private readonly approveBackup: ApproveCollectionBackup;
    private readonly mintRequestBackup: MintRequestCollectionBackup;
    private readonly mintTransactionBackup: MintTransactionCollectionBackup;

    private lastDiff: PolicyDiff | null;

    constructor(policyId: string) {
        this.policyId = policyId;
        this.lastDiff = null;

        this.vcBackup = new VcCollectionBackup(this.policyId);
        this.vpBackup = new VpCollectionBackup(this.policyId);
        this.didBackup = new DidCollectionBackup(this.policyId);
        this.stateBackup = new StateCollectionBackup(this.policyId);
        this.roleBackup = new RoleCollectionBackup(this.policyId);
        this.multiDocBackup = new MultiDocCollectionBackup(this.policyId);
        this.tokenBackup = new TokenCollectionBackup(this.policyId);
        this.tagBackup = new TagCollectionBackup(this.policyId);
        this.docStateBackup = new DocStateCollectionBackup(this.policyId);
        this.topicBackup = new TopicCollectionBackup(this.policyId);
        this.externalDocBackup = new ExternalCollectionBackup(this.policyId);
        this.approveBackup = new ApproveCollectionBackup(this.policyId);
        this.mintRequestBackup = new MintRequestCollectionBackup(this.policyId);
        this.mintTransactionBackup = new MintTransactionCollectionBackup(this.policyId);
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

    public async create(full = false): Promise<{ backup: IPolicyDiff, diff: IPolicyDiff }> {
        if (this.lastDiff.file && !full) {
            return await this._createDiff(this.lastDiff.file);
        } else {
            return await this._createFullBackup();
        }
    }

    public async save(backup: IPolicyDiff) {
        const fileId = await FileHelper.saveFile(backup);
        const lastUpdate = backup.lastUpdate;
        const collection = DataBaseHelper.orm.em.getCollection<PolicyDiff>('PolicyDiff');
        collection.updateOne(
            { _id: this.lastDiff._id },
            { $set: { lastUpdate, fileId } }
        )
        await FileHelper.deleteFile(this.lastDiff.fileId);

        this.lastDiff.fileId = fileId;
        this.lastDiff.lastUpdate = lastUpdate;
        this.lastDiff.file = backup;
    }

    private async _createFullBackup(): Promise<{ backup: IPolicyDiff, diff: IPolicyDiff }> {
        console.log('-- _createFullBackup')
        const lastUpdate = new Date();
        const vcResult = await this.vcBackup.createCollectionBackup();
        const vpResult = await this.vpBackup.createCollectionBackup();
        const didResult = await this.didBackup.createCollectionBackup();
        const stateResult = await this.stateBackup.createCollectionBackup();
        const roleResult = await this.roleBackup.createCollectionBackup();
        const multiDocResult = await this.multiDocBackup.createCollectionBackup();
        const tokenResult = await this.tokenBackup.createCollectionBackup();
        const tagResult = await this.tagBackup.createCollectionBackup();
        const docStateResult = await this.docStateBackup.createCollectionBackup();
        const topicResult = await this.topicBackup.createCollectionBackup();
        const externalDocResult = await this.externalDocBackup.createCollectionBackup();
        const approveResult = await this.approveBackup.createCollectionBackup();
        const mintRequestCollection = await this.mintRequestBackup.createCollectionBackup();
        const mintTransactionCollection = await this.mintTransactionBackup.createCollectionBackup();

        const uuid = GenerateUUIDv4();
        const backup: IPolicyDiff = {
            uuid,
            type: 'backup',
            index: 0,
            lastUpdate,
            vcCollection: vcResult.backup,
            vpCollection: vpResult.backup,
            didCollection: didResult.backup,
            stateCollection: stateResult.backup,
            roleCollection: roleResult.backup,
            multiDocCollection: multiDocResult.backup,
            tokenCollection: tokenResult.backup,
            tagCollection: tagResult.backup,
            docStateCollection: docStateResult.backup,
            topicCollection: topicResult.backup,
            externalDocCollection: externalDocResult.backup,
            approveCollection: approveResult.backup,
            mintRequestCollection: mintRequestCollection.backup,
            mintTransactionCollection: mintTransactionCollection.backup,
        }
        const diff: IPolicyDiff = {
            uuid,
            type: 'backup',
            index: 0,
            lastUpdate,
            vcCollection: vcResult.diff,
            vpCollection: vpResult.diff,
            didCollection: didResult.diff,
            stateCollection: stateResult.diff,
            roleCollection: roleResult.diff,
            multiDocCollection: multiDocResult.diff,
            tokenCollection: tokenResult.diff,
            tagCollection: tagResult.diff,
            docStateCollection: docStateResult.diff,
            topicCollection: topicResult.diff,
            externalDocCollection: externalDocResult.diff,
            approveCollection: approveResult.diff,
            mintRequestCollection: mintRequestCollection.diff,
            mintTransactionCollection: mintTransactionCollection.diff,
        }
        // console.log(JSON.stringify(backup))
        // console.log(JSON.stringify(diff))
        return { backup, diff };
    }

    private async _createDiff(oldDiff: IPolicyDiff): Promise<{ backup: IPolicyDiff, diff: IPolicyDiff }> {
        console.log('-- _createDiff')
        const lastUpdate = new Date();
        const vcResult = await this.vcBackup.createCollectionDiff(oldDiff.vcCollection, lastUpdate);
        const vpResult = await this.vpBackup.createCollectionDiff(oldDiff.vpCollection, lastUpdate);
        const didResult = await this.didBackup.createCollectionDiff(oldDiff.didCollection, lastUpdate);
        const stateResult = await this.stateBackup.createCollectionDiff(oldDiff.stateCollection, lastUpdate);
        const roleResult = await this.roleBackup.createCollectionDiff(oldDiff.roleCollection, lastUpdate);
        const multiDocResult = await this.multiDocBackup.createCollectionDiff(oldDiff.multiDocCollection, lastUpdate);
        const tokenResult = await this.tokenBackup.createCollectionDiff(oldDiff.tokenCollection, lastUpdate);
        const tagResult = await this.tagBackup.createCollectionDiff(oldDiff.tagCollection, lastUpdate);
        const docStateResult = await this.docStateBackup.createCollectionDiff(oldDiff.docStateCollection, lastUpdate);
        const topicResult = await this.topicBackup.createCollectionDiff(oldDiff.topicCollection, lastUpdate);
        const externalDocResult = await this.externalDocBackup.createCollectionDiff(oldDiff.externalDocCollection, lastUpdate);
        const approveResult = await this.approveBackup.createCollectionDiff(oldDiff.approveCollection, lastUpdate);
        const mintRequestCollection = await this.mintRequestBackup.createCollectionDiff(oldDiff.mintRequestCollection, lastUpdate);
        const mintTransactionCollection = await this.mintTransactionBackup.createCollectionDiff(oldDiff.mintTransactionCollection, lastUpdate);

        const uuid = GenerateUUIDv4();
        const backup: IPolicyDiff = {
            uuid,
            type: 'backup',
            index: (oldDiff.index || 0) + 1,
            lastUpdate,
            vcCollection: vcResult.backup,
            vpCollection: vpResult.backup,
            didCollection: didResult.backup,
            stateCollection: stateResult.backup,
            roleCollection: roleResult.backup,
            multiDocCollection: multiDocResult.backup,
            tokenCollection: tokenResult.backup,
            tagCollection: tagResult.backup,
            docStateCollection: docStateResult.backup,
            topicCollection: topicResult.backup,
            externalDocCollection: externalDocResult.backup,
            approveCollection: approveResult.backup,
            mintRequestCollection: mintRequestCollection.backup,
            mintTransactionCollection: mintTransactionCollection.backup,
        }
        const diff: IPolicyDiff = {
            uuid,
            type: 'diff',
            index: (oldDiff.index || 0) + 1,
            lastUpdate,
            vcCollection: vcResult.diff,
            vpCollection: vpResult.diff,
            didCollection: didResult.diff,
            stateCollection: stateResult.diff,
            roleCollection: roleResult.diff,
            multiDocCollection: multiDocResult.diff,
            tokenCollection: tokenResult.diff,
            tagCollection: tagResult.diff,
            docStateCollection: docStateResult.diff,
            topicCollection: topicResult.diff,
            externalDocCollection: externalDocResult.diff,
            approveCollection: approveResult.diff,
            mintRequestCollection: mintRequestCollection.diff,
            mintTransactionCollection: mintTransactionCollection.diff,
        }
        // console.log(JSON.stringify(backup))
        // console.log(JSON.stringify(diff))
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
                restoreTopicId: policy.restoreTopicId,
            } as any);
            row = await collection.findOne<PolicyDiff>({ _id: record.insertedId });
        }
        if (row?.fileId) {
            row.file = await FileHelper.loadFile(row.fileId);
        }
        this.lastDiff = row;
        console.log('-- _loadBackup (b)')
        // console.log(JSON.stringify(this.lastDiff))
    }
}