import { PolicyDiff } from '@guardian/common';
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
        await this.vpRestore.restoreBackup(backup.vpCollection);
        await this.didRestore.restoreBackup(backup.didCollection);
        await this.stateRestore.restoreBackup(backup.stateCollection);
        await this.roleRestore.restoreBackup(backup.roleCollection);
        await this.multiDocRestore.restoreBackup(backup.multiDocCollection);
        await this.tokenRestore.restoreBackup(backup.tokenCollection);
        await this.tagRestore.restoreBackup(backup.tagCollection);
        await this.docStateRestore.restoreBackup(backup.docStateCollection);
        await this.topicRestore.restoreBackup(backup.topicCollection);
        await this.externalDocRestore.restoreBackup(backup.externalDocCollection);
        await this.approveRestore.restoreBackup(backup.approveCollection);
    }

    private async _restoreDiff(diff: IPolicyDiff): Promise<void> {
        console.log('-- _restoreDiff');

        await this.vcRestore.restoreDiff(diff.vcCollection);
        await this.vpRestore.restoreDiff(diff.vpCollection);
        await this.didRestore.restoreDiff(diff.didCollection);
        await this.stateRestore.restoreDiff(diff.stateCollection);
        await this.roleRestore.restoreDiff(diff.roleCollection);
        await this.multiDocRestore.restoreDiff(diff.multiDocCollection);
        await this.tokenRestore.restoreDiff(diff.tokenCollection);
        await this.tagRestore.restoreDiff(diff.tagCollection);
        await this.docStateRestore.restoreDiff(diff.docStateCollection);
        await this.topicRestore.restoreDiff(diff.topicCollection);
        await this.externalDocRestore.restoreDiff(diff.externalDocCollection);
        await this.approveRestore.restoreDiff(diff.approveCollection);
    }
}