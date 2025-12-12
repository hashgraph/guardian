import { DataBaseHelper, DatabaseServer, ITopicMessage, MessageAction, MessageServer, Policy, PolicyActionMessage, PolicyAction, TopicConfig, TopicListener, MessageType } from '@guardian/common';
import { AssignedEntityType, GenerateUUIDv4, Permissions, PolicyActionStatus, PolicyActionType, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { ActionType, IPolicyInterfaceBlock } from './policy-engine.interface.js';
import { PolicyUser, UserCredentials } from './policy-user.js';
import { PolicyUtils } from './helpers/utils.js';
import { PolicyComponentsUtils } from './policy-components-utils.js';
import { PolicyActionsUtils } from './policy-actions/utils.js';

interface IPromise {
    resolve: Function,
    reject: Function
}

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
    }

    public async init(): Promise<void> {
        const topicConfig = await DatabaseServer.getTopicById(this.topicId);
        this.topic = await TopicConfig.fromObject(topicConfig, false, this.policyOwnerId);
        if (!this.topic) {
            throw Error('Invalid action topic');
        }

        this.topicListener = new TopicListener(this.topicId);
        this.topicListener.setListenerName(`policy_actions_${this.policyId}`);
        await this.topicListener.subscribe(this.loadTask.bind(this));
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
                interception: null
            });
        row.messageId = messageResult.getId();
        row.startMessageId = messageResult.getId();
        row.sender = messageResult.payer;
        const collection = new DataBaseHelper(PolicyAction);
        const newRow = collection.create(row);
        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(row);
        await this.sentNotification(row);

        return new Promise<any>((resolve, reject) => {
            this.actions.set(row.startMessageId, { resolve, reject });
        });
    }

    public async sendAction(
        block: IPolicyInterfaceBlock,
        user: PolicyUser,
        data: any
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
                interception: null
            });
        row.messageId = messageResult.getId();
        row.startMessageId = messageResult.getId();
        row.sender = messageResult.payer;
        const collection = new DataBaseHelper(PolicyAction);
        const newRow = collection.create(row);
        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(row);
        await this.sentNotification(row);

        return new Promise<any>((resolve, reject) => {
            this.actions.set(row.startMessageId, { resolve, reject });
        });
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
                interception: null
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
            return new Promise<any>((resolve, reject) => {
                this.actions.set(row.startMessageId, { resolve, reject });
            });
        }
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
                interception: null
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

        const cred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const row = await collection.findOne({
            messageId,
            accountId: cred.hederaAccountId,
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
                interception: null
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
        const cred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const row = await collection.findOne({
            messageId,
            accountId: cred.hederaAccountId,
            type: PolicyActionType.REQUEST
        });

        if (!row) {
            throw new Error('Request not found');
        }

        row.status = PolicyActionStatus.REJECTED;
        row.lastStatus = PolicyActionStatus.REJECTED;
        await collection.insertOrUpdate([row], 'messageId');
        await this.updateLastStatus(row);
        await this.sentNotification(row);
        return row;
    }

    private async loadTask(data: ITopicMessage): Promise<boolean> {
        try {
            const message = PolicyActionMessage.from(data);

            switch (message.action) {
                case MessageAction.CreateRemotePolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.REMOTE_ACTION, PolicyActionStatus.NEW);
                    if (this.isLocal) {
                        await this.executeAction(row);
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
                        await this.executeAction(row);
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
                    if (!this.isLocal) {
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
        let document: any;
        let loaded: boolean = false;
        try {
            const userMessageKey = await UserCredentials.loadMessageKey(this.messageId, message.owner, null);
            await MessageServer.loadDocument(message, userMessageKey);
            document = message.getDocument();
            loaded = true;
        } catch (error) {
            document = null;
            loaded = false;
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
            row.status = status;
            row.loaded = loaded;
            row.document = document;
            row.lastStatus = lastStatus;
            await collection.insertOrUpdate([row], 'messageId');
        }
        await this.updateLastStatus(row);
        return row;
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

    private async checkActionSender(row: PolicyAction, policyUser: PolicyUser) {
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
        const result = await PolicyActionsUtils.complete(row, policyUser, this.policyOwner, this.policyOwnerId);
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
                    interception: null
                });
            row.messageId = messageResult.getId();
            row.sender = messageResult.payer;

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
                    interception: null
                });
            row.messageId = messageResult.getId();
            row.sender = messageResult.payer;

            await collection.insertOrUpdate([newRow], 'messageId');

            await this.updateLastStatus(newRow);
        } catch (error) {
            console.error(error);
        }
    }

    private async updateLastStatus(row: PolicyAction) {
        const collection = DataBaseHelper.orm.em.getCollection<PolicyAction>('PolicyAction');
        collection.updateMany(
            { startMessageId: row.startMessageId },
            { $set: { lastStatus: row.lastStatus } }
        )
    }

    private async sentNotification(row: PolicyAction) {
        PolicyComponentsUtils.sentRequestNotification(row).then();
    }

    private async completeRequest(response: PolicyAction) {
        const collection = new DataBaseHelper(PolicyAction);
        const request = await collection.findOne({ messageId: response.startMessageId });
        const valid = await PolicyActionsUtils.validate(request, response, this.policyOwnerId);
        if (valid) {
            const callback = this.callback.get(request.messageId);
            this.callback.delete(request.messageId);
            if (callback) {
                await callback(response);
            }
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
            return !!(await DatabaseServer.getAssignedEntity(AssignedEntityType.Policy, this.policyId, policyUser.did));
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
                interception: null
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
        const message = await MessageServer.getMessage<PolicyActionMessage>({
            messageId,
            loadIPFS: false,
            type: MessageType.PolicyAction,
            interception: null
        })
        if (message) {
            const userMessageKey = await UserCredentials.loadMessageKey(this.messageId, message.owner, null);
            await MessageServer.loadDocument(message, userMessageKey);
            row.document = message.getDocument();
            row.loaded = true;
            await collection.insertOrUpdate([row], 'messageId');
        }
    }
}