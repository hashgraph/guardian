import { DataBaseHelper, DatabaseServer, Policy, PolicyDiff } from '@guardian/common';
import { IPolicyCollectionDiff, IPolicyDiff, IPolicyKeysDiff } from './index.js';
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
    MintTransactionCollectionBackup,
    PolicyInvitationsCollectionBackup,
    PolicyDiscussionCollectionBackup,
    PolicyCommentCollectionBackup,

    CommentsKeysBackup
} from './collections/index.js';

export class PolicyBackup {
    private readonly policyId: string;
    private readonly messageId: string;
    private readonly policyOwner: string;

    private readonly vcCollectionBackup: VcCollectionBackup;
    private readonly vpCollectionBackup: VpCollectionBackup;
    private readonly didCollectionBackup: DidCollectionBackup;
    private readonly stateCollectionBackup: StateCollectionBackup;
    private readonly roleCollectionBackup: RoleCollectionBackup;
    private readonly multiDocCollectionBackup: MultiDocCollectionBackup;
    private readonly tokenCollectionBackup: TokenCollectionBackup;
    private readonly tagCollectionBackup: TagCollectionBackup;
    private readonly docStateCollectionBackup: DocStateCollectionBackup;
    private readonly topicCollectionBackup: TopicCollectionBackup;
    private readonly externalCollectionBackup: ExternalCollectionBackup;
    private readonly approveCollectionBackup: ApproveCollectionBackup;
    private readonly mintRequestCollectionBackup: MintRequestCollectionBackup;
    private readonly mintTransactionCollectionBackup: MintTransactionCollectionBackup;
    private readonly policyInvitationsCollectionBackup: PolicyInvitationsCollectionBackup;
    private readonly policyDiscussionCollectionBackup: PolicyDiscussionCollectionBackup;
    private readonly policyCommentCollectionBackup: PolicyCommentCollectionBackup;

    private readonly commentsKeysBackup: CommentsKeysBackup;

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

        this.vcCollectionBackup = new VcCollectionBackup(this.policyId, this.messageId);
        this.vpCollectionBackup = new VpCollectionBackup(this.policyId, this.messageId);
        this.didCollectionBackup = new DidCollectionBackup(this.policyId, this.messageId);
        this.stateCollectionBackup = new StateCollectionBackup(this.policyId, this.messageId);
        this.roleCollectionBackup = new RoleCollectionBackup(this.policyId, this.messageId);
        this.multiDocCollectionBackup = new MultiDocCollectionBackup(this.policyId, this.messageId);
        this.tokenCollectionBackup = new TokenCollectionBackup(this.policyId, this.messageId);
        this.tagCollectionBackup = new TagCollectionBackup(this.policyId, this.messageId);
        this.docStateCollectionBackup = new DocStateCollectionBackup(this.policyId, this.messageId);
        this.topicCollectionBackup = new TopicCollectionBackup(this.policyId, this.messageId);
        this.externalCollectionBackup = new ExternalCollectionBackup(this.policyId, this.messageId);
        this.approveCollectionBackup = new ApproveCollectionBackup(this.policyId, this.messageId);
        this.mintRequestCollectionBackup = new MintRequestCollectionBackup(this.policyId, this.messageId);
        this.mintTransactionCollectionBackup = new MintTransactionCollectionBackup(this.policyId, this.messageId);
        this.policyInvitationsCollectionBackup = new PolicyInvitationsCollectionBackup(this.policyId, this.messageId);
        this.policyDiscussionCollectionBackup = new PolicyDiscussionCollectionBackup(this.policyId, this.messageId);
        this.policyCommentCollectionBackup = new PolicyCommentCollectionBackup(this.policyId, this.messageId);

        this.commentsKeysBackup = new CommentsKeysBackup(this.policyId, this.policyOwner, this.messageId);
    }

    public async init(): Promise<void> {
        const policy = await DatabaseServer.getPolicyById(this.policyId);
        if (policy) {
            await this._loadBackup(policy);
        } else {
            throw Error('Invalid policy');
        }
    }

    public async create(full = false): Promise<{ backup: IPolicyCollectionDiff, diff: IPolicyCollectionDiff }> {
        if (this.lastDiff.file && !full) {
            return await this._createDiff(this.lastDiff.file);
        } else {
            return await this._createFullBackup();
        }
    }

    public async keys(options: {
        comments: {
            discussion?: string,
            user?: string,
        }
    }): Promise<IPolicyKeysDiff> {
        return await this._createKeysBackup(options);
    }

    public async save(backup: IPolicyCollectionDiff) {
        const fileId = await FileHelper.saveFile(backup);
        const lastUpdate = backup.lastUpdate;
        const collection = DataBaseHelper.orm.em.getCollection<PolicyDiff>('PolicyDiff');
        await collection.updateOne(
            { _id: this.lastDiff._id },
            { $set: { lastUpdate, fileId } }
        )
        await FileHelper.deleteFile(this.lastDiff.fileId);

        this.lastDiff.fileId = fileId;
        this.lastDiff.lastUpdate = lastUpdate;
        this.lastDiff.file = backup;
    }

    private async _createFullBackup(): Promise<{ backup: IPolicyCollectionDiff, diff: IPolicyCollectionDiff }> {
        const lastUpdate = new Date();
        const vcResult = await this.vcCollectionBackup.createCollectionBackup();
        const vpResult = await this.vpCollectionBackup.createCollectionBackup();
        const didResult = await this.didCollectionBackup.createCollectionBackup();
        const stateResult = await this.stateCollectionBackup.createCollectionBackup();
        const roleResult = await this.roleCollectionBackup.createCollectionBackup();
        const multiDocResult = await this.multiDocCollectionBackup.createCollectionBackup();
        const tokenResult = await this.tokenCollectionBackup.createCollectionBackup();
        const tagResult = await this.tagCollectionBackup.createCollectionBackup();
        const docStateResult = await this.docStateCollectionBackup.createCollectionBackup();
        const topicResult = await this.topicCollectionBackup.createCollectionBackup();
        const externalDocResult = await this.externalCollectionBackup.createCollectionBackup();
        const approveResult = await this.approveCollectionBackup.createCollectionBackup();
        const mintRequestCollection = await this.mintRequestCollectionBackup.createCollectionBackup();
        const mintTransactionCollection = await this.mintTransactionCollectionBackup.createCollectionBackup();
        const policyInvitationsCollection = await this.policyInvitationsCollectionBackup.createCollectionBackup();
        const policyDiscussionCollection = await this.policyDiscussionCollectionBackup.createCollectionBackup();
        const policyCommentCollection = await this.policyCommentCollectionBackup.createCollectionBackup();

        const uuid = GenerateUUIDv4();
        const backup: IPolicyCollectionDiff = {
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
            policyInvitationsCollection: policyInvitationsCollection.backup,
            policyDiscussionCollection: policyDiscussionCollection.backup,
            policyCommentCollection: policyCommentCollection.backup,
        }
        const diff: IPolicyCollectionDiff = {
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
            policyInvitationsCollection: policyInvitationsCollection.diff,
            policyDiscussionCollection: policyDiscussionCollection.diff,
            policyCommentCollection: policyCommentCollection.diff,
        }
        return { backup, diff };
    }

    private async _createDiff(oldDiff: IPolicyCollectionDiff): Promise<{
        backup: IPolicyCollectionDiff,
        diff: IPolicyCollectionDiff
    }> {
        const lastUpdate = new Date();
        const vcResult = await this.vcCollectionBackup.createCollectionDiff(oldDiff.vcCollection, lastUpdate);
        const vpResult = await this.vpCollectionBackup.createCollectionDiff(oldDiff.vpCollection, lastUpdate);
        const didResult = await this.didCollectionBackup.createCollectionDiff(oldDiff.didCollection, lastUpdate);
        const stateResult = await this.stateCollectionBackup.createCollectionDiff(oldDiff.stateCollection, lastUpdate);
        const roleResult = await this.roleCollectionBackup.createCollectionDiff(oldDiff.roleCollection, lastUpdate);
        const multiDocResult = await this.multiDocCollectionBackup.createCollectionDiff(oldDiff.multiDocCollection, lastUpdate);
        const tokenResult = await this.tokenCollectionBackup.createCollectionDiff(oldDiff.tokenCollection, lastUpdate);
        const tagResult = await this.tagCollectionBackup.createCollectionDiff(oldDiff.tagCollection, lastUpdate);
        const docStateResult = await this.docStateCollectionBackup.createCollectionDiff(oldDiff.docStateCollection, lastUpdate);
        const topicResult = await this.topicCollectionBackup.createCollectionDiff(oldDiff.topicCollection, lastUpdate);
        const externalDocResult = await this.externalCollectionBackup.createCollectionDiff(oldDiff.externalDocCollection, lastUpdate);
        const approveResult = await this.approveCollectionBackup.createCollectionDiff(oldDiff.approveCollection, lastUpdate);
        const mintRequestCollection = await this.mintRequestCollectionBackup.createCollectionDiff(oldDiff.mintRequestCollection, lastUpdate);
        const mintTransactionCollection = await this.mintTransactionCollectionBackup.createCollectionDiff(oldDiff.mintTransactionCollection, lastUpdate);
        const policyInvitationsCollection = await this.policyInvitationsCollectionBackup.createCollectionDiff(oldDiff.policyInvitationsCollection, lastUpdate);
        const policyDiscussionCollection = await this.policyDiscussionCollectionBackup.createCollectionDiff(oldDiff.policyDiscussionCollection, lastUpdate);
        const policyCommentCollection = await this.policyCommentCollectionBackup.createCollectionDiff(oldDiff.policyCommentCollection, lastUpdate);

        const uuid = GenerateUUIDv4();
        const backup: IPolicyCollectionDiff = {
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
            policyInvitationsCollection: policyInvitationsCollection.backup,
            policyDiscussionCollection: policyDiscussionCollection.backup,
            policyCommentCollection: policyCommentCollection.backup,
        }
        const diff: IPolicyCollectionDiff = {
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
            policyInvitationsCollection: policyInvitationsCollection.diff,
            policyDiscussionCollection: policyDiscussionCollection.diff,
            policyCommentCollection: policyCommentCollection.diff,
        }
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
    }

    private async _createKeysBackup(options: {
        comments: {
            discussion?: string,
            user?: string,
        }
    }): Promise<IPolicyKeysDiff> {
        const uuid = GenerateUUIDv4();
        const lastUpdate = new Date();
        const diff: IPolicyKeysDiff = {
            uuid,
            type: 'keys',
            index: 0,
            lastUpdate,
        }

        if (options?.comments) {
            const discussionsKeys = await this.commentsKeysBackup.createDiff(options.comments, lastUpdate);
            diff.discussionsKeys = discussionsKeys;
        }

        return diff;
    }
}