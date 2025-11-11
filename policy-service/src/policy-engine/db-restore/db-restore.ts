import { DataBaseHelper, DatabaseServer, Policy, PolicyDiff } from '@guardian/common';
import { IPolicyCollectionDiff, IPolicyDiff, IPolicyKeysDiff } from './index.js';
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
    MintRequestCollectionRestore,
    MintTransactionCollectionRestore,
    PolicyInvitationsCollectionRestore,
    PolicyDiscussionCollectionRestore,
    PolicyCommentCollectionRestore,

    CommentKeysRestore
} from './collections/index.js';

export class PolicyRestore {
    private readonly policyId: string;
    private readonly messageId: string;
    private readonly policyOwner: string;

    private readonly vcCollectionRestore: VcCollectionRestore;
    private readonly vpCollectionRestore: VpCollectionRestore;
    private readonly didCollectionRestore: DidCollectionRestore;
    private readonly stateCollectionRestore: StateCollectionRestore;
    private readonly roleCollectionRestore: RoleCollectionRestore;
    private readonly multiDocCollectionRestore: MultiDocCollectionRestore;
    private readonly tokenCollectionRestore: TokenCollectionRestore;
    private readonly tagCollectionRestore: TagCollectionRestore;
    private readonly docStateCollectionRestore: DocStateCollectionRestore;
    private readonly topicCollectionRestore: TopicCollectionRestore;
    private readonly externalCollectionRestore: ExternalCollectionRestore;
    private readonly approveCollectionRestore: ApproveCollectionRestore;
    private readonly mintRequestCollectionRestore: MintRequestCollectionRestore;
    private readonly mintTransactionCollectionRestore: MintTransactionCollectionRestore;
    private readonly policyInvitationsCollectionRestore: PolicyInvitationsCollectionRestore;
    private readonly policyDiscussionCollectionRestore: PolicyDiscussionCollectionRestore;
    private readonly policyCommentCollectionRestore: PolicyCommentCollectionRestore;

    private readonly commentKeysRestore: CommentKeysRestore;

    private lastDiff: PolicyDiff | null;

    constructor(
        policyId: string,
        policyOwner: string,
        messageId: string
    ) {
        this.policyId = policyId;
        this.policyOwner = policyOwner;
        this.messageId = messageId;
        this.lastDiff = null;

        this.vcCollectionRestore = new VcCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.vpCollectionRestore = new VpCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.didCollectionRestore = new DidCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.stateCollectionRestore = new StateCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.roleCollectionRestore = new RoleCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.multiDocCollectionRestore = new MultiDocCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.tokenCollectionRestore = new TokenCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.tagCollectionRestore = new TagCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.docStateCollectionRestore = new DocStateCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.topicCollectionRestore = new TopicCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.externalCollectionRestore = new ExternalCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.approveCollectionRestore = new ApproveCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.mintRequestCollectionRestore = new MintRequestCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.mintTransactionCollectionRestore = new MintTransactionCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.policyInvitationsCollectionRestore = new PolicyInvitationsCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.policyDiscussionCollectionRestore = new PolicyDiscussionCollectionRestore(this.policyId, this.policyOwner, this.messageId);
        this.policyCommentCollectionRestore = new PolicyCommentCollectionRestore(this.policyId, this.policyOwner, this.messageId);

        this.commentKeysRestore = new CommentKeysRestore(this.policyId, this.policyOwner, this.messageId);
    }

    public async init(): Promise<void> {
        const policy = await DatabaseServer.getPolicyById(this.policyId);
        if (policy) {
            await this._loadBackup(policy);
        } else {
            throw Error('Invalid policy');
        }
    }

    public async restore(file: string): Promise<void> {
        const diff = FileHelper.decryptFile(file);

        if (diff.type === 'backup') {
            await this._restoreBackup(diff);
        } else if (diff.type === 'keys') {
            await this._restoreKeys(diff);
        } else {
            await this._restoreDiff(diff);
        }
    }

    private async _restoreBackup(backup: IPolicyCollectionDiff): Promise<void> {
        const oldDiff: IPolicyCollectionDiff = this.lastDiff.file || {};

        oldDiff.uuid = backup.uuid;
        oldDiff.index = backup.index;
        oldDiff.lastUpdate = backup.lastUpdate;
        oldDiff.type = backup.type;
        oldDiff.vcCollection = await this.vcCollectionRestore.restoreBackup(backup.vcCollection);
        oldDiff.vpCollection = await this.vpCollectionRestore.restoreBackup(backup.vpCollection);
        oldDiff.didCollection = await this.didCollectionRestore.restoreBackup(backup.didCollection);
        oldDiff.stateCollection = await this.stateCollectionRestore.restoreBackup(backup.stateCollection);
        oldDiff.roleCollection = await this.roleCollectionRestore.restoreBackup(backup.roleCollection);
        oldDiff.multiDocCollection = await this.multiDocCollectionRestore.restoreBackup(backup.multiDocCollection);
        oldDiff.tokenCollection = await this.tokenCollectionRestore.restoreBackup(backup.tokenCollection);
        oldDiff.tagCollection = await this.tagCollectionRestore.restoreBackup(backup.tagCollection);
        oldDiff.docStateCollection = await this.docStateCollectionRestore.restoreBackup(backup.docStateCollection);
        oldDiff.topicCollection = await this.topicCollectionRestore.restoreBackup(backup.topicCollection);
        oldDiff.externalDocCollection = await this.externalCollectionRestore.restoreBackup(backup.externalDocCollection);
        oldDiff.approveCollection = await this.approveCollectionRestore.restoreBackup(backup.approveCollection);
        oldDiff.mintRequestCollection = await this.mintRequestCollectionRestore.restoreBackup(backup.mintRequestCollection);
        oldDiff.mintTransactionCollection = await this.mintTransactionCollectionRestore.restoreBackup(backup.mintTransactionCollection);
        oldDiff.policyInvitationsCollection = await this.policyInvitationsCollectionRestore.restoreBackup(backup.policyInvitationsCollection);
        oldDiff.policyDiscussionCollection = await this.policyDiscussionCollectionRestore.restoreBackup(backup.policyDiscussionCollection);
        oldDiff.policyCommentCollection = await this.policyCommentCollectionRestore.restoreBackup(backup.policyCommentCollection);

        await this._saveBackup(oldDiff);
    }

    private async _restoreDiff(diff: IPolicyCollectionDiff): Promise<void> {
        const oldDiff: IPolicyCollectionDiff = this.lastDiff.file || {};
        oldDiff.uuid = diff.uuid;
        oldDiff.index = diff.index;
        oldDiff.lastUpdate = diff.lastUpdate;
        oldDiff.type = diff.type;
        oldDiff.vcCollection = await this.vcCollectionRestore.restoreDiff(diff.vcCollection, oldDiff.vcCollection);
        oldDiff.vpCollection = await this.vpCollectionRestore.restoreDiff(diff.vpCollection, oldDiff.vpCollection);
        oldDiff.didCollection = await this.didCollectionRestore.restoreDiff(diff.didCollection, oldDiff.didCollection);
        oldDiff.stateCollection = await this.stateCollectionRestore.restoreDiff(diff.stateCollection, oldDiff.stateCollection);
        oldDiff.roleCollection = await this.roleCollectionRestore.restoreDiff(diff.roleCollection, oldDiff.roleCollection);
        oldDiff.multiDocCollection = await this.multiDocCollectionRestore.restoreDiff(diff.multiDocCollection, oldDiff.multiDocCollection);
        oldDiff.tokenCollection = await this.tokenCollectionRestore.restoreDiff(diff.tokenCollection, oldDiff.tokenCollection);
        oldDiff.tagCollection = await this.tagCollectionRestore.restoreDiff(diff.tagCollection, oldDiff.tagCollection);
        oldDiff.docStateCollection = await this.docStateCollectionRestore.restoreDiff(diff.docStateCollection, oldDiff.docStateCollection);
        oldDiff.topicCollection = await this.topicCollectionRestore.restoreDiff(diff.topicCollection, oldDiff.topicCollection);
        oldDiff.externalDocCollection = await this.externalCollectionRestore.restoreDiff(diff.externalDocCollection, oldDiff.externalDocCollection);
        oldDiff.approveCollection = await this.approveCollectionRestore.restoreDiff(diff.approveCollection, oldDiff.approveCollection);
        oldDiff.mintRequestCollection = await this.mintRequestCollectionRestore.restoreDiff(diff.mintRequestCollection, oldDiff.mintRequestCollection);
        oldDiff.mintTransactionCollection = await this.mintTransactionCollectionRestore.restoreDiff(diff.mintTransactionCollection, oldDiff.mintTransactionCollection);
        oldDiff.policyInvitationsCollection = await this.policyInvitationsCollectionRestore.restoreDiff(diff.policyInvitationsCollection, oldDiff.policyInvitationsCollection);
        oldDiff.policyDiscussionCollection = await this.policyDiscussionCollectionRestore.restoreDiff(diff.policyDiscussionCollection, oldDiff.policyDiscussionCollection);
        oldDiff.policyCommentCollection = await this.policyCommentCollectionRestore.restoreDiff(diff.policyCommentCollection, oldDiff.policyCommentCollection);

        await this._saveBackup(oldDiff);
    }

    private async _restoreKeys(diff: IPolicyKeysDiff): Promise<void> {
        console.log(diff);
        await this.commentKeysRestore.restoreBackup(diff.discussionsKeys);
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
    }

    private async _saveBackup(backup: IPolicyCollectionDiff) {
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
            !!backup.approveCollection &&
            !!backup.mintRequestCollection &&
            !!backup.mintTransactionCollection &&
            !!backup.policyInvitationsCollection &&
            !!backup.policyDiscussionCollection &&
            !!backup.policyCommentCollection
        )

        const fileId = await FileHelper.saveFile(backup);
        const lastUpdate = backup.lastUpdate;
        const collection = DataBaseHelper.orm.em.getCollection<PolicyDiff>('PolicyDiff');
        await collection.updateOne(
            { _id: this.lastDiff._id },
            { $set: { lastUpdate, fileId, valid } }
        )
        console.log(`_saveBackup`);
        await FileHelper.deleteFile(this.lastDiff.fileId);

        this.lastDiff.fileId = fileId;
        this.lastDiff.lastUpdate = lastUpdate;
        this.lastDiff.file = backup;
        this.lastDiff.valid = valid;
    }
}