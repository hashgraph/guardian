import { DataBaseHelper, DatabaseServer, ITopicMessage, MessageAction, MessageServer, Policy, PolicyActionMessage, PolicyActions, TopicConfig, TopicListener } from "@guardian/common";
import { GenerateUUIDv4, PolicyActionType, PolicyStatus } from "@guardian/interfaces";
import { IPolicyInterfaceBlock } from "./policy-engine.interface.js";
import { PolicyUser } from "./policy-user.js";
import { PolicyUtils } from "./helpers/utils.js";
import { PolicyComponentsUtils } from "./policy-components-utils.js";

export class PolicyActionsService {
    private readonly topicId: string;
    private readonly policyId: string;
    private readonly isLocal: boolean;
    private readonly policyInstance: IPolicyInterfaceBlock;
    private readonly policyOwner: string;
    private topic: TopicConfig;
    private topicListener: TopicListener;

    constructor(policyId: string, policyInstance: IPolicyInterfaceBlock, policy: Policy) {
        this.policyId = policyId;
        this.topicId = policy.actionsTopicId;
        this.isLocal = policy.status !== PolicyStatus.VIEW;
        this.policyInstance = policyInstance;
        this.policyOwner = policy.owner;
    }

    public async init(): Promise<void> {
        console.debug('--- PolicyActionsService init')
        const topicConfig = await DatabaseServer.getTopicById(this.topicId);
        this.topic = await TopicConfig.fromObject(topicConfig);
        if (!this.topic) {
            throw Error('Invalid action topic');
        }

        this.topicListener = new TopicListener(this.topicId);
        this.topicListener.setListenerName(`policy_actions_${this.policyId}`);
        await this.topicListener.subscribe(this.loadTask.bind(this));
    }

    public async sendRemoteAction(
        block: IPolicyInterfaceBlock,
        user: PolicyUser,
        data: any
    ): Promise<any> {
        const credentials = await PolicyUtils.getUserCredentials(block, user.did);
        const userHederaCred = await credentials.loadHederaCredentials(block);
        const signOptions = await credentials.loadSignOptions(block);
        const messageServer = new MessageServer(
            userHederaCred.hederaAccountId,
            userHederaCred.hederaAccountKey,
            signOptions
        );
        const row: any = {
            uuid: GenerateUUIDv4(),
            owner: user.did,
            creator: user.did,
            topicId: this.topicId,
            policyId: this.policyId,
            status: 'NEW',
            accountId: userHederaCred.hederaAccountId,
            blockTag: block.tag,
            messageId: null,
            startMessageId: null,
            document: data
        };
        const message = new PolicyActionMessage(MessageAction.CreatePolicyAction);
        message.setDocument(row, data);

        console.debug(row, data);
        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, true);
        row.messageId = messageResult.getId();
        row.startMessageId = messageResult.getId();
        const collection = new DataBaseHelper(PolicyActions);
        await collection.insertOrUpdate([row], 'messageId');
    }

    public async sendRemoteRequest(
        block: IPolicyInterfaceBlock,
        user: PolicyUser,
        data: any
    ): Promise<any> {

    }

    private async loadTask(data: ITopicMessage): Promise<boolean> {
        console.debug('--- loadTask');
        try {
            const message = PolicyActionMessage.from(data);

            switch (message.action) {
                case MessageAction.CreatePolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.NEW);
                    if (this.isLocal) {
                        await this.createPolicyAction(row);
                    } else {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.UpdatePolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.COMPLETED);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.ErrorPolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.ERROR);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.CreatePolicyRequest: {
                    const row = await this.savePolicyAction(message, PolicyActionType.NEW);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.UpdatePolicyRequest: {
                    const row = await this.savePolicyAction(message, PolicyActionType.COMPLETED);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.ErrorPolicyRequest: {
                    const row = await this.savePolicyAction(message, PolicyActionType.ERROR);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    break;
                }
                default: {
                    break;
                }
            }
            console.debug('--- task --');
        } catch (error) {
            console.log(error);
        }
        return true;
    }

    private async savePolicyAction(message: PolicyActionMessage, status: PolicyActionType) {
        const collection = new DataBaseHelper(PolicyActions);
        console.debug('--- savePolicyAction --');
        let document: any;
        try {
            console.debug('--- loadDocument --');
            await MessageServer.loadDocument(message);
            document = message.getDocument();
        } catch (error) {
            console.debug('--- error --', error);
            document = null;
        }
        let row = await collection.findOne({ messageId: message.id });
        if (!row) {
            row = collection.create({
                status,
                uuid: message.uuid,
                owner: message.owner,
                creator: message.owner,
                accountId: message.payer,
                blockTag: message.blockTag,
                messageId: message.id,
                startMessageId: message.parent,
                topicId: message.topicId?.toString(),
                index: Number(message.index),
                policyId: this.policyId,
                document
            });
            await collection.save(row);
        } else {
            row.uuid = message.uuid;
            row.owner = message.owner;
            row.creator = message.owner;
            row.accountId = message.payer;
            row.topicId = message.topicId?.toString();
            row.blockTag = message.blockTag;
            row.messageId = message.id;
            row.index = Number(message.index);
            row.startMessageId = message.parent;
            row.policyId = this.policyId;
            row.status = status;
            row.document = document;
            await collection.update(row);
        }
        return row;
    }

    private async createPolicyAction(row: PolicyActions) {
        try {
            console.debug('---- 1', row);
            if (!row || !row.document) {
                throw new Error('Invalid document');
            }

            // User
            const policyUser = await PolicyComponentsUtils.GetPolicyUserByAccount(row.accountId, this.policyInstance);
            if (!policyUser) {
                console.debug('---- 2', row);
                return;
            }

            // Available
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(this.policyId, row.blockTag);
            const error = await PolicyComponentsUtils.isAvailableSetData(block, policyUser);
            if (error) {
                console.debug('---- 3', row);
                return;
            }

            const result = await block.setData(policyUser, row.document);

            console.debug('---- 4', row);
            await this.sentCompleteMessage(row, result);
        } catch (error) {
            console.debug('---- 7', error);
            await this.sentErrorMessage(row, error);
        }
    }

    private async sentCompleteMessage(row: PolicyActions, result: any) {
        try {
            const root = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner);
            const userHederaCred = await root.loadHederaCredentials(this.policyInstance);
            const signOptions = await root.loadSignOptions(this.policyInstance);
            const messageServer = new MessageServer(
                userHederaCred.hederaAccountId,
                userHederaCred.hederaAccountKey,
                signOptions
            );
            const collection = new DataBaseHelper(PolicyActions);
            const newRow = collection.create({
                status: PolicyActionType.COMPLETED,
                uuid: row.uuid,
                owner: row.owner,
                creator: row.owner,
                accountId: userHederaCred.hederaAccountId,
                blockTag: row.blockTag,
                messageId: null,
                startMessageId: row.messageId,
                topicId: this.topicId,
                index: null,
                policyId: this.policyId,
                document: null
            });

            const message = new PolicyActionMessage(MessageAction.UpdatePolicyAction);
            message.setDocument(newRow, newRow.document);

            const messageResult = await messageServer
                .setTopicObject(this.topic)
                .sendMessage(message, true);
            row.messageId = messageResult.getId();

            await collection.save(newRow);
        } catch (error) {
            console.error(error);
        }
    }

    private async sentErrorMessage(row: PolicyActions, error: string | Error) {
        console.debug('- Error ???');
        try {
            const policyUser = await PolicyComponentsUtils.GetPolicyUserByAccount(row.accountId, this.policyInstance);
            if (!policyUser) {
                return;
            }

            const root = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner);
            const userHederaCred = await root.loadHederaCredentials(this.policyInstance);
            const signOptions = await root.loadSignOptions(this.policyInstance);
            const messageServer = new MessageServer(
                userHederaCred.hederaAccountId,
                userHederaCred.hederaAccountKey,
                signOptions
            );
            const collection = new DataBaseHelper(PolicyActions);
            const newRow = collection.create({
                status: PolicyActionType.ERROR,
                uuid: row.uuid,
                owner: row.owner,
                creator: row.owner,
                accountId: userHederaCred.hederaAccountId,
                blockTag: row.blockTag,
                messageId: null,
                startMessageId: row.messageId,
                topicId: this.topicId,
                index: null,
                policyId: this.policyId,
                document: typeof error === 'string' ? error : error.message
            });

            const message = new PolicyActionMessage(MessageAction.ErrorPolicyAction);
            message.setDocument(newRow, newRow.document);

            const messageResult = await messageServer
                .setTopicObject(this.topic)
                .sendMessage(message, true);
            row.messageId = messageResult.getId();

            await collection.save(newRow);
        } catch (error) {
            console.error(error);
        }
    }

    private async sentNotification(row: PolicyActions) {
        console.debug('- update');
    }
}