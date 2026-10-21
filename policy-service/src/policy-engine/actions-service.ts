import { DataBaseHelper } from '@guardian/common/helpers/db-helper';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { ITopicMessage, TopicListener } from '@guardian/common/topic-listener/topic-listener';
import { Policy } from '@guardian/common/entity/policy';
import { PolicyAction } from '@guardian/common/entity/policy-action';
import { MessageAction } from '@guardian/hedera/message/message-action';
import { MessageServer } from '@guardian/hedera/message/message-server';
import { PolicyActionMessage } from '@guardian/hedera/message/policy-action-message';
import { TopicConfig } from '@guardian/hedera/topic';
import { Users } from '@guardian/common/helpers/users';
import { MessageType } from '@guardian/hedera/message/message-type';
import { AssignedEntityType, GenerateUUIDv4, LocationType, Permissions, PolicyActionStatus, PolicyActionType, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { ActionType, IPolicyInterfaceBlock } from './policy-engine.interface.js';
import { PolicyUser, UserCredentials } from './policy-user.js';
import { PolicyUtils } from './helpers/utils.js';
import { PolicyComponentsUtils } from './policy-components-utils.js';
import { PolicyActionsUtils } from './policy-actions/utils.js';
import { isPolicyAssignedToUserOrg } from './helpers/org-utils.js';

interface IPromise {
    resolve: Function,
    reject: Function
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Default lifetime of a pending request or action
 */
const DEFAULT_EXPIRATION_DAYS = 7;

/**
 * Longest interval between two checks for expired requests and actions
 */
const EXPIRATION_CHECK_INTERVAL = 60 * 60 * 1000;

/**
 * Once a row reaches one of these it keeps it: a replayed or echoed message must
 * not move it back, and REJECTED / CANCELED are not carried by any message.
 */
const SETTLED_STATUSES = [
    PolicyActionStatus.COMPLETED,
    PolicyActionStatus.ERROR,
    PolicyActionStatus.REJECTED,
    PolicyActionStatus.CANCELED
];

export const RESTART_ERROR = 'The request was interrupted by a policy-service restart – please try again';
export const EXPIRED_ERROR = 'The request expired without a response';
export const REJECTED_ERROR = 'The request was rejected by the user';

export class PolicyActionsService {
    private readonly topicId: string;
    private readonly policyId: string;
    private readonly isLocal: boolean;
    private readonly policyInstance: IPolicyInterfaceBlock;
    private readonly policyOwner: string;
    private readonly policyOwnerId: string;
    private readonly messageId: string;

    private topic: TopicConfig;
    private topicListener: TopicListener;
    private readonly callback: Map<string, Function>;
    private readonly actions: Map<string, IPromise>;
    private readonly executions: Map<string, Promise<void>>;
    private readonly expiration: number;
    private expirationTimer: ReturnType<typeof setInterval> | null;
    private readonly ready: Promise<void>;
    private resolveReady: () => void;
    private rejectReady: (error: Error) => void;
    private destroyed: boolean;

    constructor(
        policyId: string,
        policyInstance: IPolicyInterfaceBlock,
        policy: Policy,
        policyOwnerId: string | null
    ) {
        this.policyId = policyId;
        this.topicId = policy.actionsTopicId;
        this.isLocal = policy.status !== PolicyStatus.VIEW;
        this.policyInstance = policyInstance;
        this.policyOwner = policy.owner;
        this.policyOwnerId = policyOwnerId;
        this.messageId = policy.messageId;
        this.callback = new Map<string, Function>();
        this.actions = new Map<string, IPromise>();
        this.executions = new Map<string, Promise<void>>();
        this.expiration = PolicyActionsService.getExpiration();
        this.expirationTimer = null;
        this.destroyed = false;
        this.ready = new Promise<void>((resolve, reject) => {
            this.resolveReady = resolve;
            this.rejectReady = reject;
        });
        // Queued actions handle a stop themselves, this only keeps it from going unhandled
        this.ready.catch(() => null);
    }

    /**
     * Lifetime of a pending request or action in ms, 0 - never expires
     */
    public static getExpiration(): number {
        const value = process.env.REMOTE_ACTIONS_EXPIRATION_DAYS;
        const days = Number(value);
        if (value === undefined || value.trim() === '' || !Number.isFinite(days) || days < 0) {
            return DEFAULT_EXPIRATION_DAYS * DAY;
        }
        return days * DAY;
    }

    public async init(): Promise<void> {
        const topicConfig = await DatabaseServer.getTopicById(this.topicId);
        this.topic = await TopicConfig.fromObject(topicConfig, false, this.policyOwnerId);
        if (!this.topic) {
            throw Error('Invalid action topic');
        }

        // Before the listener starts, so a replayed message cannot race the cleanup,
        // and actions queued here stay ahead of live ones of the same owner
        await this.failInterrupted();

        this.topicListener = new TopicListener(this.topicId);
        this.topicListener.setListenerName(`policy_actions_${this.policyId}`);
        await this.topicListener.subscribe(this.loadTask.bind(this));

        this.startExpiration();
    }

    /**
     * Let queued actions run. Called once the service is registered: an action
     * may send a request to the user through it.
     */
    public start(): void {
        this.resolveReady();
    }

    public async destroy(): Promise<void> {
        this.destroyed = true;
        this.rejectReady(new Error('The policy was stopped'));
        if (this.expirationTimer) {
            clearInterval(this.expirationTimer);
            this.expirationTimer = null;
        }
        if (this.topicListener) {
            await this.topicListener.close();
        }
    }

    public async selectGroup(
        user: PolicyUser,
        uuid: string
    ): Promise<any> {
        const data = { uuid };
        const userCred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const userHederaCred = await userCred.loadHederaCredentials(this.policyInstance, user.userId);
        const userSignOptions = await userCred.loadSignOptions(this.policyInstance, user.userId);
        const userMessageKey = await userCred.loadMessageKey(this.policyInstance, user.userId);

        if (!userMessageKey) {
            throw Error('Decentralized access key is not set');
        }

        const messageServer = new MessageServer({
            operatorId: userHederaCred.hederaAccountId,
            operatorKey: userHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: userSignOptions,
            dryRun: this.policyInstance.dryRun
        });
        const row: any = {
            uuid: GenerateUUIDv4(),
            type: PolicyActionType.ACTION,
            owner: user.did,
            creator: user.did,
            topicId: this.topicId,
            policyId: this.policyId,
            policyMessageId: this.messageId,
            status: PolicyActionStatus.NEW,
            accountId: userHederaCred.hederaAccountId,
            blockTag: 'Groups',
            messageId: null,
            startMessageId: null,
            sender: null,
            document: data,
            lastStatus: PolicyActionStatus.NEW,
            loaded: true
        };
        const message = new PolicyActionMessage(MessageAction.CreatePolicyAction);
        message.setDocument(row, data);

        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId: null,
                interception: null,
                dryRun: this.policyInstance.dryRun,
                mockId: null
            });
        row.messageId = messageResult.getId();
        row.startMessageId = messageResult.getId();
        row.sender = messageResult.payer;
        const collection = new DataBaseHelper(PolicyAction);
        const newRow = collection.create(row);
        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(row);
        await this.sentNotification(row);

        return this.waitAction(row.startMessageId);
    }

    public async sendAction(
        block: IPolicyInterfaceBlock,
        user: PolicyUser,
        data: any,
        waitRemotePolicy?: boolean,
        waitUntil?: number
    ): Promise<any> {
        const userCred = await PolicyUtils.getUserCredentials(block, user.did, user.userId);
        const userHederaCred = await userCred.loadHederaCredentials(block, user.userId);
        const userSignOptions = await userCred.loadSignOptions(block, user.userId);
        const userMessageKey = await userCred.loadMessageKey(block, user.userId);

        if (!userMessageKey) {
            throw Error('Decentralized access key is not set');
        }

        const messageServer = new MessageServer({
            operatorId: userHederaCred.hederaAccountId,
            operatorKey: userHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: userSignOptions,
            dryRun: block.dryRun
        });
        const row: any = {
            uuid: GenerateUUIDv4(),
            type: PolicyActionType.ACTION,
            owner: user.did,
            creator: user.did,
            topicId: this.topicId,
            policyId: this.policyId,
            policyMessageId: this.messageId,
            status: PolicyActionStatus.NEW,
            accountId: userHederaCred.hederaAccountId,
            blockTag: block.tag,
            messageId: null,
            startMessageId: null,
            sender: null,
            document: data,
            lastStatus: PolicyActionStatus.NEW,
            loaded: true
        };
        const message = new PolicyActionMessage(MessageAction.CreatePolicyAction);
        message.setDocument(row, data);

        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId: null,
                interception: null,
                dryRun: block.dryRun,
                mockId: null
            });
        row.messageId = messageResult.getId();
        row.startMessageId = messageResult.getId();
        row.sender = messageResult.payer;
        const collection = new DataBaseHelper(PolicyAction);
        const newRow = collection.create(row);
        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(row);
        await this.sentNotification(row);

        if (waitRemotePolicy === false) {
            return true;
        } else {
            return this.waitAction(row.startMessageId, waitUntil);
        }
    }

    public async sendRemoteAction(
        user: PolicyUser,
        data: any,
        needResult: boolean = false
    ): Promise<any> {
        const userCred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const userHederaCred = await userCred.loadHederaCredentials(this.policyInstance, user.userId);
        const userSignOptions = await userCred.loadSignOptions(this.policyInstance, user.userId);
        const userMessageKey = await userCred.loadMessageKey(this.policyInstance, user.userId);

        if (!userMessageKey) {
            throw Error('Decentralized access key is not set');
        }

        const messageServer = new MessageServer({
            operatorId: userHederaCred.hederaAccountId,
            operatorKey: userHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: userSignOptions,
            dryRun: this.policyInstance.dryRun
        });
        const row: any = {
            uuid: GenerateUUIDv4(),
            type: PolicyActionType.REMOTE_ACTION,
            owner: user.did,
            creator: user.did,
            topicId: this.topicId,
            policyId: this.policyId,
            policyMessageId: this.messageId,
            status: PolicyActionStatus.NEW,
            accountId: userHederaCred.hederaAccountId,
            blockTag: 'RemoteAction',
            messageId: null,
            startMessageId: null,
            sender: null,
            document: data,
            lastStatus: PolicyActionStatus.NEW,
            loaded: true
        };
        const message = new PolicyActionMessage(MessageAction.CreateRemotePolicyAction);
        message.setDocument(row, data);

        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId: null,
                interception: null,
                dryRun: this.policyInstance.dryRun,
                mockId: null
            });
        row.messageId = messageResult.getId();
        row.startMessageId = messageResult.getId();
        row.sender = messageResult.payer;
        const collection = new DataBaseHelper(PolicyAction);
        const newRow = collection.create(row);
        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(row);
        await this.sentNotification(row);

        if (needResult) {
            return this.waitAction(row.startMessageId);
        }
    }

    /**
     * Wait for the remote policy to answer an action.
     * With waitUntil set, stop waiting at that time and return true (as
     * waitRemotePolicy=false does); the action itself carries on.
     */
    private waitAction(startMessageId: string, waitUntil?: number): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let timer: ReturnType<typeof setTimeout> | null = null;
            const stop = () => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            };
            const promise: IPromise = {
                resolve: (value: any) => { stop(); resolve(value); },
                reject: (error: any) => { stop(); reject(error); }
            };
            this.actions.set(startMessageId, promise);
            if (typeof waitUntil === 'number' && Number.isFinite(waitUntil)) {
                timer = setTimeout(() => {
                    timer = null;
                    if (this.actions.get(startMessageId) === promise) {
                        this.actions.delete(startMessageId);
                    }
                    resolve(true);
                }, Math.max(waitUntil - Date.now(), 0));
            }
        });
    }

    public async sendRequest(
        data: PolicyAction,
        callback: (action: PolicyAction) => Promise<void>,
        userId: string | null
    ): Promise<any> {
        const policyOwnerCred = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner, this.policyOwnerId);
        const policyOwnerHederaCred = await policyOwnerCred.loadHederaCredentials(this.policyInstance, this.policyOwnerId);
        const policyOwnerSignOptions = await policyOwnerCred.loadSignOptions(this.policyInstance, this.policyOwnerId);
        const userMessageKey = await UserCredentials.loadMessageKey(this.messageId, data.owner, userId);
        if (!userMessageKey) {
            throw Error('Decentralized access key is not set');
        }
        const messageServer = new MessageServer({
            operatorId: policyOwnerHederaCred.hederaAccountId,
            operatorKey: policyOwnerHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: policyOwnerSignOptions
        });
        const collection = new DataBaseHelper(PolicyAction);
        const newRow = collection.create({
            status: PolicyActionStatus.NEW,
            type: PolicyActionType.REQUEST,
            uuid: data.uuid,
            owner: data.owner,
            creator: data.owner,
            accountId: data.accountId,
            relayerAccount: data.relayerAccount,
            blockTag: data.blockTag,
            topicId: data.topicId,
            policyId: this.policyId,
            policyMessageId: this.messageId,
            document: data.document,
            messageId: null,
            startMessageId: null,
            index: null,
            lastStatus: PolicyActionStatus.NEW,
            loaded: true
        });

        const message = new PolicyActionMessage(MessageAction.CreatePolicyRequest);
        message.setDocument(newRow, newRow.document);

        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId: null,
                interception: null,
                dryRun: null,
                mockId: null
            });

        newRow.messageId = messageResult.getId();
        newRow.startMessageId = messageResult.getId();
        newRow.sender = messageResult.payer;

        this.callback.set(newRow.messageId, callback);

        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(newRow);
        await this.sentNotification(newRow);

        return newRow;
    }

    public async sendResponse(messageId: string, user: PolicyUser) {
        const collection = new DataBaseHelper(PolicyAction);

        const userCred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const row = await collection.findOne({
            messageId,
            accountId: userCred.hederaAccountId,
            type: PolicyActionType.REQUEST
        });

        if (!row) {
            throw new Error('Request not found');
        }

        const data = await PolicyActionsUtils.response({
            row,
            user,
            relayerAccount: row.relayerAccount,
            userId: user.userId
        });

        const userHederaCred = await userCred.loadHederaCredentials(this.policyInstance, user.userId);
        const userSignOptions = await userCred.loadSignOptions(this.policyInstance, user.userId);
        const userMessageKey = await userCred.loadMessageKey(this.policyInstance, user.userId);
        const messageServer = new MessageServer({
            operatorId: userHederaCred.hederaAccountId,
            operatorKey: userHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: userSignOptions
        });

        const newRow = collection.create({
            status: PolicyActionStatus.COMPLETED,
            type: row.type,
            uuid: row.uuid,
            owner: row.owner,
            creator: row.owner,
            accountId: row.accountId,
            relayerAccount: row.relayerAccount,
            blockTag: row.blockTag,
            messageId: null,
            sender: null,
            startMessageId: row.messageId,
            topicId: this.topicId,
            index: null,
            policyId: this.policyId,
            policyMessageId: this.messageId,
            document: data,
            lastStatus: PolicyActionStatus.COMPLETED,
            loaded: true
        });

        const message = new PolicyActionMessage(MessageAction.UpdatePolicyRequest);
        message.setDocument(newRow, newRow.document);

        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId: null,
                interception: null,
                dryRun: null,
                mockId: null
            });
        newRow.messageId = messageResult.getId();
        newRow.sender = messageResult.payer;

        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(newRow);
        await this.sentNotification(newRow);

        return newRow;
    }

    public async rejectRequest(messageId: string, user: PolicyUser) {
        const collection = new DataBaseHelper(PolicyAction);
        const userCred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const row = await collection.findOne({
            messageId,
            accountId: userCred.hederaAccountId,
            type: PolicyActionType.REQUEST
        });

        if (!row) {
            throw new Error('Request not found');
        }

        const userMessageKey = await userCred.loadMessageKey(this.policyInstance, user.userId);
        if (!userMessageKey) {
            // Nothing can be sent without the key: reject locally and let the
            // main instance settle the request when it expires. As in markFailed,
            // the first row keeps its status.
            row.lastStatus = PolicyActionStatus.REJECTED;
            await this.updateLastStatus(row);
            await this.sentNotification(row);
            return row;
        }

        const userHederaCred = await userCred.loadHederaCredentials(this.policyInstance, user.userId);
        const userSignOptions = await userCred.loadSignOptions(this.policyInstance, user.userId);
        const messageServer = new MessageServer({
            operatorId: userHederaCred.hederaAccountId,
            operatorKey: userHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: userSignOptions
        });

        const newRow = collection.create({
            status: PolicyActionStatus.REJECTED,
            type: row.type,
            uuid: row.uuid,
            owner: row.owner,
            creator: row.owner,
            accountId: row.accountId,
            relayerAccount: row.relayerAccount,
            blockTag: row.blockTag,
            messageId: null,
            sender: null,
            startMessageId: row.messageId,
            topicId: this.topicId,
            index: null,
            policyId: this.policyId,
            policyMessageId: this.messageId,
            document: REJECTED_ERROR,
            lastStatus: PolicyActionStatus.REJECTED,
            loaded: true
        });

        // The main instance reads it as an error response and fails the waiting step
        const message = new PolicyActionMessage(MessageAction.ErrorPolicyRequest);
        message.setDocument(newRow, newRow.document);

        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId: null,
                interception: null,
                dryRun: null,
                mockId: null
            });
        newRow.messageId = messageResult.getId();
        newRow.sender = messageResult.payer;

        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(newRow);
        await this.sentNotification(newRow);
        return newRow;
    }

    private async loadTask(data: ITopicMessage): Promise<boolean> {
        try {
            const message = PolicyActionMessage.from(data);

            switch (message.action) {
                case MessageAction.CreateRemotePolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.REMOTE_ACTION, PolicyActionStatus.NEW);
                    if (this.isLocal) {
                        this.queueAction(row);
                    } else {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.UpdateRemotePolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.REMOTE_ACTION, PolicyActionStatus.COMPLETED);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    const promise = this.actions.get(row.startMessageId);
                    if (promise) {
                        this.actions.delete(row.startMessageId);
                        promise.resolve(row.document);
                    }
                    break;
                }
                case MessageAction.ErrorRemotePolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.REMOTE_ACTION, PolicyActionStatus.ERROR);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    const promise = this.actions.get(row.startMessageId);
                    if (promise) {
                        this.actions.delete(row.startMessageId);
                        promise.reject(row.document);
                    }
                    break;
                }
                case MessageAction.CreatePolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.ACTION, PolicyActionStatus.NEW);
                    if (this.isLocal) {
                        this.queueAction(row);
                    } else {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.UpdatePolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.ACTION, PolicyActionStatus.COMPLETED);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    const promise = this.actions.get(row.startMessageId);
                    if (promise) {
                        this.actions.delete(row.startMessageId);
                        promise.resolve(row.document);
                    }
                    break;
                }
                case MessageAction.ErrorPolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.ACTION, PolicyActionStatus.ERROR);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    const promise = this.actions.get(row.startMessageId);
                    if (promise) {
                        this.actions.delete(row.startMessageId);
                        promise.reject(row.document);
                    }
                    break;
                }
                case MessageAction.CreatePolicyRequest: {
                    const row = await this.savePolicyAction(message, PolicyActionType.REQUEST, PolicyActionStatus.NEW);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.UpdatePolicyRequest: {
                    const row = await this.savePolicyAction(message, PolicyActionType.REQUEST, PolicyActionStatus.COMPLETED);
                    if (this.isLocal) {
                        await this.completeRequest(row);
                    } else {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.ErrorPolicyRequest: {
                    const row = await this.savePolicyAction(message, PolicyActionType.REQUEST, PolicyActionStatus.ERROR);
                    if (this.isLocal) {
                        await this.failRequest(row);
                    } else {
                        await this.sentNotification(row);
                    }
                    break;
                }
                default: {
                    break;
                }
            }
        } catch (error) {
            console.log(error);
        }
        return true;
    }

    private async savePolicyAction(
        message: PolicyActionMessage,
        type: PolicyActionType,
        status: PolicyActionStatus
    ) {
        const collection = new DataBaseHelper(PolicyAction);
        let document: any = null;
        let loaded: boolean = false;
        // Every user of the policy shares the topic: only decrypt what belongs to a user of this instance
        if (await this.isKnownOwner(message.owner)) {
            try {
                const userMessageKey = await UserCredentials.loadMessageKey(this.messageId, message.owner, null);
                await MessageServer.loadDocument(message, userMessageKey, {
                    dryRun: null,
                    mockId: null
                });
                document = message.getDocument();
                loaded = true;
            } catch (error) {
                document = null;
                loaded = false;
            }
        }
        let lastStatus = PolicyActionStatus.NEW;
        switch (message.action) {
            case MessageAction.CreatePolicyRequest: {
                lastStatus = PolicyActionStatus.NEW;
                break;
            }
            case MessageAction.UpdatePolicyRequest: {
                lastStatus = PolicyActionStatus.COMPLETED;
                break;
            }
            case MessageAction.ErrorPolicyRequest: {
                lastStatus = PolicyActionStatus.ERROR;
                break;
            }
            case MessageAction.CreatePolicyAction: {
                lastStatus = PolicyActionStatus.NEW;
                break;
            }
            case MessageAction.UpdatePolicyAction: {
                lastStatus = PolicyActionStatus.COMPLETED;
                break;
            }
            case MessageAction.ErrorPolicyAction: {
                lastStatus = PolicyActionStatus.ERROR;
                break;
            }
            default: {
                lastStatus = PolicyActionStatus.NEW;
                break;
            }
        }
        let row = await collection.findOne({ messageId: message.id });
        if (!row) {
            row = collection.create({
                status,
                type,
                uuid: message.uuid,
                owner: message.owner,
                creator: message.owner,
                accountId: message.accountId,
                relayerAccount: message.relayerAccount,
                sender: message.payer,
                blockTag: message.blockTag,
                messageId: message.id,
                startMessageId: message.parent || message.id,
                topicId: message.topicId?.toString(),
                index: Number(message.index),
                policyId: this.policyId,
                policyMessageId: this.messageId,
                loaded,
                document,
                lastStatus
            });
            await collection.insertOrUpdate([row], 'messageId');
        } else {
            row.type = type;
            row.uuid = message.uuid;
            row.owner = message.owner;
            row.creator = message.owner;
            row.accountId = message.accountId;
            row.relayerAccount = message.relayerAccount;
            row.sender = message.payer;
            row.topicId = message.topicId?.toString();
            row.blockTag = message.blockTag;
            row.messageId = message.id;
            row.index = Number(message.index);
            row.startMessageId = message.parent || message.id;
            row.policyId = this.policyId;
            row.policyMessageId = this.messageId;
            if (!SETTLED_STATUSES.includes(row.status)) {
                row.status = status;
            }
            if (!SETTLED_STATUSES.includes(row.lastStatus)) {
                row.lastStatus = lastStatus;
            }
            // Keep the document this instance wrote if the echo cannot be read
            if (loaded || !row.loaded) {
                row.loaded = loaded;
                row.document = document;
            }
            await collection.insertOrUpdate([row], 'messageId');
        }
        await this.updateLastStatus(row);
        return row;
    }

    /**
     * Atomically claim a row for execution. Returns false when it was already
     * claimed, so a redelivered message cannot run the action a second time.
     * Keyed on messageId, not _id: insertOrUpdate deletes _id from the row it is
     * given when the row already exists.
     *
     * `executedAt` lives only in the database and is deliberately not mapped on
     * the PolicyAction entity: an ORM save of a row read before the claim would
     * otherwise write it back as undefined and erase the claim.
     */
    private async claimForExecution(row: PolicyAction): Promise<boolean> {
        const collection = DataBaseHelper.orm.em.getCollection('PolicyAction');
        const result = await collection.updateOne(
            { messageId: row.messageId, executedAt: null },
            { $set: { executedAt: new Date() } }
        );
        return result?.modifiedCount === 1;
    }

    /**
     * Whether the owner's message key can be on this instance: a local user on
     * the home side, a registered user on the main side.
     */
    private async isKnownOwner(did: string): Promise<boolean> {
        if (!did) {
            return false;
        }
        try {
            const user = await (new Users()).getUserById(did, null);
            if (!user) {
                return false;
            }
            return this.isLocal || user.location !== LocationType.REMOTE;
        } catch (error) {
            // Cannot tell: try the key as before
            return true;
        }
    }

    /**
     * Run actions off the listener, so one long execution does not hold up the
     * whole topic. Actions of the same owner still run in order.
     */
    private queueAction(row: PolicyAction, reload: boolean = false): void {
        // Already settled: a message replayed after a restart must not run twice
        if (!row || SETTLED_STATUSES.includes(row.status) || SETTLED_STATUSES.includes(row.lastStatus)) {
            return;
        }
        const key = row.owner || '';
        const previous = this.executions.get(key) || this.ready;
        const next = previous
            .then(() => this.runQueued(row, reload))
            .catch((error) => {
                if (!this.destroyed) {
                    console.error(error);
                }
            });
        this.executions.set(key, next);
        next.then(() => {
            if (this.executions.get(key) === next) {
                this.executions.delete(key);
            }
        });
    }

    private async runQueued(row: PolicyAction, reload: boolean): Promise<void> {
        if (this.destroyed) {
            return;
        }
        // Saved before the owner's key was here: try again now, unless the owner
        // is not one this instance can hold a key for
        if (reload && !row.loaded) {
            if (!await this.isKnownOwner(row.owner) || !await this.reloadDocument(row)) {
                return;
            }
        }
        await this.executeAction(row);
    }

    private async executeAction(row: PolicyAction) {
        try {
            if (!row) {
                return;
            }

            // User
            const policyUser = await PolicyComponentsUtils.GetPolicyUserByDID(row.owner, null, this.policyInstance, this.policyOwnerId);
            if (!policyUser) {
                return;
            }
            if (!this.checkActionSender(row, policyUser)) {
                return;
            }

            if (!row.document) {
                throw new Error('Invalid document');
            }

            const access = await this.accessPolicy(policyUser);
            if (!access) {
                throw new Error('Insufficient permissions to execute the policy.');
            }

            // Claimed only after the checks above, so a delivery that failed them
            // (document not loaded yet, user not synced yet) can still be retried.
            if (!await this.claimForExecution(row)) {
                return;
            }

            if (row.type === PolicyActionType.REMOTE_ACTION) {
                await this.executeRemoteAction(row, policyUser);
            } else {
                if (row.blockTag === 'Groups') {
                    await this.executeGroup(row, policyUser);
                } else {
                    await this.executeBlock(row, policyUser);
                }
            }
        } catch (error) {
            await this.sentErrorMessage(row, error, this.policyOwnerId);
        }
    }

    private checkActionSender(row: PolicyAction, policyUser: PolicyUser): boolean {
        return policyUser.hederaAccountId === row.sender && row.accountId === row.sender;
    }

    private async executeBlock(row: PolicyAction, policyUser: PolicyUser) {
        const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(this.policyId, row.blockTag);
        const error = await PolicyComponentsUtils.isAvailableSetData(block, policyUser);
        if (error) {
            throw error;
        }

        // TODO: do we need to record actions from remote policy ?
        const result = await block.setData(policyUser, row.document, ActionType.REMOTE, null);
        await this.sentCompleteMessage(row, policyUser, result, this.policyOwnerId);
    }

    private async executeGroup(row: PolicyAction, policyUser: PolicyUser) {
        const result = await this.policyInstance.components.selectGroup(policyUser, row.document?.uuid);
        this.policyInstance.backup();
        await this.sentCompleteMessage(row, policyUser, result, this.policyOwnerId);
    }

    private async executeRemoteAction(row: PolicyAction, policyUser: PolicyUser) {
        const result = await PolicyActionsUtils.complete(row, policyUser, this.policyOwner, this.policyOwnerId, this.policyId);
        this.policyInstance.backup();
        await this.sentCompleteMessage(row, policyUser, result, this.policyOwnerId);
    }

    private async sentCompleteMessage(
        row: PolicyAction,
        policyUser: PolicyUser,
        result: any,
        userId: string | null
    ) {
        try {
            const policyOwnerCred = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner, userId);
            const policyOwnerHederaCred = await policyOwnerCred.loadHederaCredentials(this.policyInstance, userId);
            const policyOwnerSignOptions = await policyOwnerCred.loadSignOptions(this.policyInstance, userId);
            const userMessageKey = await UserCredentials.loadMessageKey(this.messageId, policyUser.did, userId);
            if (!userMessageKey) {
                throw Error('Decentralized access key is not set');
            }
            const messageServer = new MessageServer({
                operatorId: policyOwnerHederaCred.hederaAccountId,
                operatorKey: policyOwnerHederaCred.hederaAccountKey,
                encryptKey: userMessageKey,
                signOptions: policyOwnerSignOptions
            });
            const collection = new DataBaseHelper(PolicyAction);
            const newRow = collection.create({
                status: PolicyActionStatus.COMPLETED,
                type: row.type,
                uuid: row.uuid,
                owner: row.owner,
                creator: row.owner,
                accountId: row.accountId,
                blockTag: row.blockTag,
                messageId: null,
                sender: null,
                startMessageId: row.messageId,
                topicId: this.topicId,
                index: null,
                policyId: this.policyId,
                policyMessageId: this.messageId,
                document: result,
                loaded: true,
                lastStatus: PolicyActionStatus.COMPLETED
            });

            const message = new PolicyActionMessage(MessageAction.UpdatePolicyAction);
            message.setDocument(newRow, newRow.document);

            const messageResult = await messageServer
                .setTopicObject(this.topic)
                .sendMessage(message, {
                    sendToIPFS: true,
                    memo: null,
                    userId: null,
                    interception: null,
                    dryRun: null,
                    mockId: null
                });
            newRow.messageId = messageResult.getId();
            newRow.sender = messageResult.payer;

            await collection.insertOrUpdate([newRow], 'messageId');

            await this.updateLastStatus(newRow);
        } catch (error) {
            console.error(error);
        }
    }

    private async sentErrorMessage(
        row: PolicyAction,
        error: string | Error,
        userId: string | null
    ) {
        try {
            if (row.sender !== row.accountId) {
                return;
            }
            const policyUser = await PolicyComponentsUtils.GetPolicyUserByDID(row.owner, null, this.policyInstance, userId);
            if (!policyUser) {
                return;
            }

            const policyOwnerCred = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner, userId);
            const policyOwnerHederaCred = await policyOwnerCred.loadHederaCredentials(this.policyInstance, userId);
            const policyOwnerSignOptions = await policyOwnerCred.loadSignOptions(this.policyInstance, userId);
            const userMessageKey = await UserCredentials.loadMessageKey(this.messageId, row.owner, userId);
            if (!userMessageKey) {
                throw Error('Decentralized access key is not set');
            }
            const messageServer = new MessageServer({
                operatorId: policyOwnerHederaCred.hederaAccountId,
                operatorKey: policyOwnerHederaCred.hederaAccountKey,
                encryptKey: userMessageKey,
                signOptions: policyOwnerSignOptions
            });
            const collection = new DataBaseHelper(PolicyAction);
            const newRow = collection.create({
                type: row.type,
                status: PolicyActionStatus.ERROR,
                uuid: row.uuid,
                owner: row.owner,
                creator: row.owner,
                accountId: row.accountId,
                blockTag: row.blockTag,
                messageId: null,
                startMessageId: row.messageId,
                topicId: this.topicId,
                index: null,
                policyId: this.policyId,
                policyMessageId: this.messageId,
                loaded: true,
                document: typeof error === 'string' ? error : error.message,
                lastStatus: PolicyActionStatus.ERROR
            });

            const message = new PolicyActionMessage(MessageAction.ErrorPolicyAction);
            message.setDocument(newRow, newRow.document);

            const messageResult = await messageServer
                .setTopicObject(this.topic)
                .sendMessage(message, {
                    sendToIPFS: true,
                    memo: null,
                    userId: null,
                    interception: null,
                    dryRun: null,
                    mockId: null
                });
            newRow.messageId = messageResult.getId();
            newRow.sender = messageResult.payer;

            await collection.insertOrUpdate([newRow], 'messageId');

            await this.updateLastStatus(newRow);
        } catch (error) {
            console.error(error);
        }
    }

    private async updateLastStatus(row: PolicyAction) {
        const collection = DataBaseHelper.orm.em.getCollection<PolicyAction>('PolicyAction');
        await collection.updateMany(
            { startMessageId: row.startMessageId },
            { $set: { lastStatus: row.lastStatus } }
        );
    }

    private async sentNotification(row: PolicyAction) {
        PolicyComponentsUtils.sentRequestNotification(row).catch((error) => console.error(error));
    }

    private async completeRequest(response: PolicyAction) {
        const collection = new DataBaseHelper(PolicyAction);
        const request = await collection.findOne({ messageId: response.startMessageId });
        if (!request || response.sender !== request.accountId) {
            return;
        }
        const valid = await PolicyActionsUtils.validate(request, response, this.policyOwnerId);
        if (valid) {
            const callback = this.callback.get(request.messageId);
            this.callback.delete(request.messageId);
            if (callback) {
                await callback(response);
            }
        }
    }

    /**
     * An error response (e.g. the user rejected the request): fail the waiting step
     */
    private async failRequest(response: PolicyAction) {
        const collection = new DataBaseHelper(PolicyAction);
        const request = await collection.findOne({ messageId: response.startMessageId });
        if (!request || request.type !== PolicyActionType.REQUEST || response.sender !== request.accountId) {
            return;
        }
        await this.settleRequest(request, response.document || REJECTED_ERROR);
    }

    /**
     * Settle the step waiting on a request as a failure
     */
    private async settleRequest(request: PolicyAction, reason: string) {
        const callback = this.callback.get(request.messageId);
        this.callback.delete(request.messageId);
        if (callback) {
            await callback({
                ...request,
                status: PolicyActionStatus.ERROR,
                document: reason
            } as PolicyAction);
        }
    }

    /**
     * Settle the call waiting on an action as a failure
     */
    private settleAction(action: PolicyAction, reason: string) {
        const promise = this.actions.get(action.startMessageId);
        this.actions.delete(action.startMessageId);
        if (promise) {
            promise.reject(reason);
        }
    }

    /**
     * What waits on a pending row lives in memory and does not survive a restart.
     * On the main instance that is the block waiting on a request, or the
     * execution of an incoming action. An action that had started may have
     * stopped half way, so it is failed, not run again. One that never started
     * (still queued, or its owner not registered yet) is queued again, unless
     * the home side has already given up on it. The home side keeps nothing that
     * cannot be rebuilt: a late response still updates its rows.
     */
    private async failInterrupted(): Promise<void> {
        if (!this.isLocal) {
            return;
        }
        try {
            const requests = await this.findPending([PolicyActionType.REQUEST]);
            const actions = await this.findPending([PolicyActionType.ACTION, PolicyActionType.REMOTE_ACTION]);
            const started = await this.findStarted(actions);
            const interrupted = [...requests, ...actions.filter((row) => started.has(row.messageId))];
            const notStarted = actions.filter((row) => !started.has(row.messageId));
            const since = this.expiration ? Date.now() - this.expiration : null;
            const requeue = notStarted.filter((row) => since === null || new Date(row.createDate).getTime() >= since);
            // The home side failed its copy at expiry without telling anyone, so these go quietly
            const expired = notStarted.filter((row) => !requeue.includes(row));

            await this.markFailed([...interrupted, ...expired]);
            requeue.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
            for (const row of requeue) {
                this.queueAction(row, true);
            }
            // Sending to Hedera must not hold up the policy start
            this.notifyFailed(interrupted, RESTART_ERROR).catch((error) => console.error(error));
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Message IDs of the actions whose execution began (see claimForExecution)
     */
    private async findStarted(rows: PolicyAction[]): Promise<Set<string>> {
        if (!rows.length) {
            return new Set();
        }
        const collection = DataBaseHelper.orm.em.getCollection('PolicyAction');
        const started = await collection.find(
            { messageId: { $in: rows.map((row) => row.messageId) }, executedAt: { $ne: null } },
            { projection: { messageId: 1 } }
        ).toArray();
        return new Set(started.map((row) => row.messageId));
    }

    private startExpiration(): void {
        if (!this.expiration || this.expirationTimer) {
            return;
        }
        const interval = Math.max(Math.min(this.expiration, EXPIRATION_CHECK_INTERVAL), 60 * 1000);
        this.expirationTimer = setInterval(() => {
            this.expirePending().catch((error) => console.error(error));
        }, interval);
        this.expirationTimer.unref?.();
        this.expirePending().catch((error) => console.error(error));
    }

    /**
     * Fail requests (main side) and actions (home side) left without a response
     */
    public async expirePending(): Promise<void> {
        if (!this.expiration) {
            return;
        }
        const types = this.isLocal
            ? [PolicyActionType.REQUEST]
            : [PolicyActionType.ACTION, PolicyActionType.REMOTE_ACTION];
        const rows = await this.findPending(types, new Date(Date.now() - this.expiration));
        await this.markFailed(rows);
        await this.notifyFailed(rows, EXPIRED_ERROR);
    }

    private async findPending(types: PolicyActionType[], before?: Date): Promise<PolicyAction[]> {
        const collection = new DataBaseHelper(PolicyAction);
        const filter: any = {
            policyId: this.policyId,
            type: { $in: types },
            status: PolicyActionStatus.NEW,
            lastStatus: PolicyActionStatus.NEW
        };
        if (before) {
            filter.createDate = { $lt: before };
        }
        return await collection.find(filter);
    }

    /**
     * Only the thread's lastStatus changes: the first row stays the NEW request,
     * which the requests grid and its counts look for
     */
    private async markFailed(rows: PolicyAction[]): Promise<void> {
        for (const row of rows) {
            row.lastStatus = PolicyActionStatus.ERROR;
            await this.updateLastStatus(row);
        }
    }

    /**
     * Fail whatever waits on the rows and tell the other side
     */
    private async notifyFailed(rows: PolicyAction[], reason: string): Promise<void> {
        for (const row of rows) {
            try {
                if (row.type === PolicyActionType.REQUEST) {
                    await this.settleRequest(row, reason);
                    if (this.isLocal) {
                        await this.sentRequestError(row, reason);
                    }
                } else {
                    this.settleAction(row, reason);
                    if (this.isLocal) {
                        await this.sentErrorMessage(row, reason, this.policyOwnerId);
                    }
                }
                await this.sentNotification(row);
            } catch (error) {
                console.error(error);
            }
        }
    }

    /**
     * Tell the home instance a request failed on this side
     */
    private async sentRequestError(row: PolicyAction, reason: string) {
        try {
            const policyOwnerCred = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner, this.policyOwnerId);
            // Only answer requests this instance sent, not ones anybody can post on the topic
            if (row.sender !== policyOwnerCred.hederaAccountId) {
                return;
            }
            const userMessageKey = await UserCredentials.loadMessageKey(this.messageId, row.owner, this.policyOwnerId);
            if (!userMessageKey) {
                return;
            }
            const policyOwnerHederaCred = await policyOwnerCred.loadHederaCredentials(this.policyInstance, this.policyOwnerId);
            const policyOwnerSignOptions = await policyOwnerCred.loadSignOptions(this.policyInstance, this.policyOwnerId);
            const messageServer = new MessageServer({
                operatorId: policyOwnerHederaCred.hederaAccountId,
                operatorKey: policyOwnerHederaCred.hederaAccountKey,
                encryptKey: userMessageKey,
                signOptions: policyOwnerSignOptions
            });
            const collection = new DataBaseHelper(PolicyAction);
            const newRow = collection.create({
                type: row.type,
                status: PolicyActionStatus.ERROR,
                uuid: row.uuid,
                owner: row.owner,
                creator: row.owner,
                accountId: row.accountId,
                relayerAccount: row.relayerAccount,
                blockTag: row.blockTag,
                messageId: null,
                sender: null,
                startMessageId: row.messageId,
                topicId: this.topicId,
                index: null,
                policyId: this.policyId,
                policyMessageId: this.messageId,
                loaded: true,
                document: reason,
                lastStatus: PolicyActionStatus.ERROR
            });

            const message = new PolicyActionMessage(MessageAction.ErrorPolicyRequest);
            message.setDocument(newRow, newRow.document);

            const messageResult = await messageServer
                .setTopicObject(this.topic)
                .sendMessage(message, {
                    sendToIPFS: true,
                    memo: null,
                    userId: null,
                    interception: null,
                    dryRun: null,
                    mockId: null
                });
            newRow.messageId = messageResult.getId();
            newRow.sender = messageResult.payer;

            await collection.insertOrUpdate([newRow], 'messageId');
            await this.updateLastStatus(newRow);
        } catch (error) {
            console.error(error);
        }
    }

    private async accessPolicy(policyUser: PolicyUser): Promise<boolean> {
        if (UserPermissions.has(policyUser, [
            Permissions.ACCESS_POLICY_PUBLISHED,
            Permissions.ACCESS_POLICY_ALL
        ])) {
            return true;
        }
        if (UserPermissions.has(policyUser, [
            Permissions.ACCESS_POLICY_ASSIGNED,
            Permissions.ACCESS_POLICY_ASSIGNED_AND_PUBLISHED
        ])) {
            if (await DatabaseServer.getAssignedEntity(AssignedEntityType.Policy, this.policyId, policyUser.did)) {
                return true;
            }
            /*
             * An organization assignment grants access only within the policy's own
             * owner, matching guardian-service's accessPolicyCode. Only a known
             * mismatch denies: a dry-run or bare-DID user has no parent to compare.
             */
            if (policyUser.parent && this.policyOwner && policyUser.parent !== this.policyOwner) {
                return false;
            }
            try {
                return await isPolicyAssignedToUserOrg(policyUser, this.policyId);
            } catch {
                return false;
            }
        }
        return false;
    }

    public async cancelAction(messageId: string, user: PolicyUser) {
        const collection = new DataBaseHelper(PolicyAction);

        const cred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const row = await collection.findOne({
            messageId,
            accountId: cred.hederaAccountId,
            type: PolicyActionType.ACTION
        });

        if (!row) {
            throw new Error('Action not found');
        }

        const userCred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const userHederaCred = await userCred.loadHederaCredentials(this.policyInstance, user.userId);
        const userSignOptions = await userCred.loadSignOptions(this.policyInstance, user.userId);
        const userMessageKey = await userCred.loadMessageKey(this.policyInstance, user.userId);
        const messageServer = new MessageServer({
            operatorId: userHederaCred.hederaAccountId,
            operatorKey: userHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: userSignOptions
        });

        const newRow = collection.create({
            status: PolicyActionStatus.CANCELED,
            type: row.type,
            uuid: row.uuid,
            owner: row.owner,
            creator: row.owner,
            accountId: row.accountId,
            blockTag: row.blockTag,
            messageId: null,
            sender: null,
            startMessageId: row.messageId,
            topicId: this.topicId,
            index: null,
            policyId: this.policyId,
            policyMessageId: this.messageId,
            document: null,
            loaded: true,
            lastStatus: PolicyActionStatus.CANCELED
        });

        const message = new PolicyActionMessage(MessageAction.UpdatePolicyAction);
        message.setDocument(newRow, newRow.document);

        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId: null,
                interception: null,
                dryRun: null,
                mockId: null
            });
        newRow.messageId = messageResult.getId();
        newRow.sender = messageResult.payer;

        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(newRow);
        await this.sentNotification(newRow);

        return newRow;
    }

    public async loadAction(messageId: string, user: PolicyUser) {
        const collection = new DataBaseHelper(PolicyAction);
        const row = await collection.findOne({
            messageId,
            accountId: user.hederaAccountId
        });
        if (!row) {
            throw Error('Action not found');
        }
        await this.reloadDocument(row);
    }

    /**
     * Fetch and decrypt the document of a row saved without it. False when the
     * owner's key or the message is not there.
     */
    private async reloadDocument(row: PolicyAction): Promise<boolean> {
        const userMessageKey = await UserCredentials.loadMessageKey(this.messageId, row.owner, null);
        if (!userMessageKey) {
            return false;
        }
        const message = await MessageServer.tryGetMessage<PolicyActionMessage>({
            messageId: row.messageId,
            loadIPFS: false,
            type: MessageType.PolicyAction,
            interception: null,
            dryRun: null,
            mockId: null
        });
        if (!message) {
            return false;
        }
        await MessageServer.loadDocument(message, userMessageKey, {
            dryRun: null,
            mockId: null
        });
        row.document = message.getDocument();
        row.loaded = true;
        await new DataBaseHelper(PolicyAction).insertOrUpdate([row], 'messageId');
        return true;
    }
}