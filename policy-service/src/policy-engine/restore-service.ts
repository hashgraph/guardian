import { IPolicyDiff, PolicyBackup, PolicyRestore } from './db-restore/index.js';
import { FileHelper } from './db-restore/file-helper.js';
import { DatabaseServer, ITopicMessage, MessageAction, MessageServer, MessageType, Policy, PolicyDiffMessage, TopicConfig, TopicListener, Users } from '@guardian/common';
import { PolicyComponentsUtils } from './policy-components-utils.js';

class Timer {
    private readonly min: number;
    private readonly max: number;
    private callback: () => Promise<void>;

    private _actions: number;
    private _minTimer: any;
    private _maxTimer: any;
    private _lock: boolean;
    private readonly _tickStart: any;
    private readonly _tickEnd: any;

    constructor(min: number, max: number) {
        this.min = min;
        this.max = max;
        this._actions = 0;
        this._minTimer = null;
        this._maxTimer = null;
        this._lock = false;

        this._tickStart = this.tickStart.bind(this);
        this._tickEnd = this.tickEnd.bind(this);
    }

    public subscribe(callback: () => Promise<void>): Timer {
        this.callback = callback;
        return this;
    }

    public push(): Timer {
        this._actions++;
        if (this._lock) {
            return this;
        }
        if (this._minTimer) {
            clearTimeout(this._minTimer);
            this._minTimer = setTimeout(this._tickStart, this.min);
        } else {
            this._minTimer = setTimeout(this._tickStart, this.min);
        }
        if (!this._maxTimer) {
            this._maxTimer = setTimeout(this._tickStart, this.max);
        }
        return this;
    }

    private tickStart() {
        this._lock = true;
        clearTimeout(this._minTimer);
        clearTimeout(this._maxTimer);
        this._actions = 0;
        this.callback()
            .then(this._tickEnd)
            .catch(this._tickEnd);
    }

    private tickEnd() {
        this._lock = false;
        this._minTimer = null;
        this._maxTimer = null;
        if (this._actions) {
            this.push();
        }
    }
}

export class PolicyBackupService {
    private readonly topicId: string;
    private readonly owner: string;
    private readonly controller: PolicyBackup;
    private readonly timer: Timer;

    private messageServer: MessageServer;
    private userId: string;
    private readonly policyTopicId: string;
    private readonly instanceTopicId: string;
    private readonly policyOwnerId: string;

    constructor(policyId: string, policy: Policy, policyOwnerId: string | null) {
        this.controller = new PolicyBackup(policyId);
        this.topicId = policy.restoreTopicId;
        this.owner = policy.owner;
        this.policyTopicId = policy.topicId;
        this.instanceTopicId = policy.instanceTopicId;
        this.policyOwnerId = policyOwnerId;

        this.timer = new Timer(30 * 1000, 120 * 1000);
        this.timer.subscribe(this.task.bind(this));
    }

    public async init(): Promise<void> {
        await this.controller.init();

        const root = await (new Users()).getHederaAccount(this.owner, this.policyOwnerId);
        if (!root) {
            throw Error('Invalid user');
        }

        const topicConfig = await DatabaseServer.getTopicById(this.topicId);
        const topic = await TopicConfig.fromObjectV2(topicConfig, this.policyOwnerId);
        if (!topic) {
            throw Error('Invalid restore topic');
        }
        this.userId = root.id;

        this.messageServer = new MessageServer(
            root.hederaAccountId,
            root.hederaAccountKey,
            root.signOptions
        ).setTopicObject(topic);

        this.backup();
    }

    public backup(): void {
        this.timer.push();
    }

    private async task() {
        try {
            const { backup, diff } = await this.controller.create(false);
            await this.sendDiff(diff);
            await this.controller.save(backup);
        } catch (error) {
            console.error(error);
        }
    }

    private async sendDiff(diff: IPolicyDiff) {
        const file = FileHelper.encryptFile(diff);
        const buffer = await FileHelper.zipFile(file);

        const type = diff.type === 'backup' ? MessageAction.PublishPolicyBackup : MessageAction.PublishPolicyDiff;
        const message = new PolicyDiffMessage(MessageType.PolicyDiff, type);
        message.setDocument({
            uuid: diff.uuid,
            owner: this.owner,
            diffType: diff.type,
            diffIndex: diff.index,
            policyTopicId: this.policyTopicId,
            instanceTopicId: this.instanceTopicId,
        }, buffer);
        const result = await this.messageServer
            .sendMessage(message, true, null, this.userId);

        diff.messageId = result.getId();
    }
}

export class PolicyRestoreService {
    private readonly topicId: string;
    // private readonly owner: string;
    private readonly controller: PolicyRestore;
    private readonly policyId: string;
    // private messageServer: MessageServer;
    // private readonly policyOwnerId: string;
    private topicListener: TopicListener;

    constructor(policyId: string, policy: Policy, policyOwnerId: string | null) {
        this.controller = new PolicyRestore(policyId);
        this.policyId = policyId;
        this.topicId = policy.restoreTopicId;
        // this.owner = policy.owner;
        // this.policyOwnerId = policy.policyOwnerId;
    }

    public async init(): Promise<void> {
        await this.controller.init();

        this.topicListener = new TopicListener(this.topicId);
        this.topicListener.setListenerName(`policy_restore_${this.policyId}`);
        await this.topicListener.subscribe(this.task.bind(this));
    }

    private async task(data: ITopicMessage): Promise<boolean> {
        try {
            const message = PolicyDiffMessage.fromMessage(data.message);
            await MessageServer.loadDocument(message);
            const file = await FileHelper.unZipFile(message.document);
            await this.controller.restore(file);
            await PolicyComponentsUtils.restoreState(this.policyId);
            PolicyComponentsUtils.sentRestoreNotification(this.policyId);
        } catch (error) {
            console.log(error);
        }
        return true;
    }
}
