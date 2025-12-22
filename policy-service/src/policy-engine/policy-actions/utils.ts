import { IDocumentOptions, Message, PolicyAction, PolicyComment, PolicyDiscussion, RoleMessage, Token, TopicConfig, VcDocumentDefinition } from '@guardian/common';
import { LocationType, PolicyActionStatus, PolicyAvailability, PolicyStatus, TopicType } from '@guardian/interfaces';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { BlockActionError } from '../errors/index.js';
import { SignAndSendRole } from './sign-and-send-role.js';
import { GenerateDID } from './generate-did.js';
import { SignVC } from './sign-vc.js';
import { PolicyActionType } from './policy-action.type.js';
import { SendMessage } from './send-message.js';
import { CreateTopic } from './create-topic.js';
import { AssociateToken } from './associate-token.js';
import { DissociateToken } from './dissociate-token.js';
import { SendMessages } from './send-messages.js';
import { RelayerAccountAction } from './relayer-account.js';
import { PolicyDiscussionAction } from './policy-discussion.js';
import { PolicyCommentAction } from './policy-comment.js';

export class PolicyActionsUtils {
    private static needKey(status: PolicyStatus, availability: PolicyAvailability): boolean {
        switch (status) {
            case PolicyStatus.DRY_RUN:
            case PolicyStatus.DEMO:
            case PolicyStatus.VIEW:
            case PolicyStatus.DRAFT:
            case PolicyStatus.PUBLISH_ERROR: {
                return false;
            }
            case PolicyStatus.PUBLISH:
            case PolicyStatus.DISCONTINUED: {
                if (availability === PolicyAvailability.PUBLIC) {
                    return false;
                } else {
                    return true;
                }
            };
            default: return false;
        }
    }

    public static async validate(
        request: PolicyAction,
        response: PolicyAction,
        userId: string | null
    ) {
        const type = request?.document?.type;
        switch (type) {
            case PolicyActionType.SignAndSendRole: {
                return await SignAndSendRole.validate(request, response, userId);
            }
            case PolicyActionType.GenerateDID: {
                return await GenerateDID.validate(request, response, userId);
            }
            case PolicyActionType.SignVC: {
                return await SignVC.validate(request, response, userId);
            }
            case PolicyActionType.SendMessage: {
                return await SendMessage.validate(request, response, userId);
            }
            case PolicyActionType.SendMessages: {
                return await SendMessages.validate(request, response, userId);
            }
            case PolicyActionType.CreateTopic: {
                return await CreateTopic.validate(request, response, userId);
            }
            case PolicyActionType.AssociateToken: {
                return await AssociateToken.validate(request, response, userId);
            }
            case PolicyActionType.DissociateToken: {
                return await DissociateToken.validate(request, response, userId);
            }
            default:
                return false;
        }
    }

    public static async complete(
        remoteAction: PolicyAction,
        user: PolicyUser,
        policyOwner: string,
        policyOwnerId: string | null
    ) {
        const type = remoteAction?.document?.type;
        switch (type) {
            case PolicyActionType.AddRelayerAccount: {
                return await RelayerAccountAction.complete(remoteAction, user, policyOwnerId);
            }
            case PolicyActionType.CreatePolicyDiscussion: {
                return await PolicyDiscussionAction.complete(remoteAction, policyOwner);
            }
            case PolicyActionType.CreatePolicyComment: {
                return await PolicyCommentAction.complete(remoteAction);
            }
            default:
                return false;
        }
    }

    public static async response(options: {
        row: PolicyAction,
        user: PolicyUser,
        relayerAccount: string,
        userId: string | null
    }) {
        const type = options?.row?.document?.type;
        switch (type) {
            case PolicyActionType.SignAndSendRole: {
                return await SignAndSendRole.response(options);
            }
            case PolicyActionType.GenerateDID: {
                return await GenerateDID.response(options);
            }
            case PolicyActionType.SignVC: {
                return await SignVC.response(options);
            }
            case PolicyActionType.SendMessage: {
                return await SendMessage.response(options);
            }
            case PolicyActionType.SendMessages: {
                return await SendMessages.response(options);
            }
            case PolicyActionType.CreateTopic: {
                return await CreateTopic.response(options);
            }
            case PolicyActionType.AssociateToken: {
                return await AssociateToken.response(options);
            }
            case PolicyActionType.DissociateToken: {
                return await DissociateToken.response(options);
            }
            default:
                throw new Error('Invalid command');
        }
    }

    /**
     * policy-roles
     */
    public static async signAndSendRole(options: {
        ref: AnyBlockType,
        subject: any,
        group: any,
        uuid: string,
        relayerAccount: string,
        userId: string | null
    }): Promise<{
        vc: VcDocumentDefinition,
        message: RoleMessage
    }> {
        const { ref, group, userId } = options;
        const did = group.did;
        const userCred = await PolicyUtils.getUserCredentials(ref, did, userId);

        if (userCred.location === LocationType.LOCAL) {
            return await SignAndSendRole.local(options);
        } else {
            const data = await SignAndSendRole.request(options);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SignAndSendRole.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * action-block
     */
    public static async downloadPrivateDocument(
        ref: AnyBlockType,
        userDID: string,
        sensorDid: string,
        userId: string | null
    ) {
        const userCred = await PolicyUtils.getUserCredentials(ref, userDID, userId);
        if (userCred.location === LocationType.LOCAL) {
            const hederaCred = await userCred.loadHederaCredentials(ref, userId);
            const didDocument = await userCred.loadSubDidDocument(ref, sensorDid, userId);
            return {
                hederaAccountId: hederaCred.hederaAccountId,
                hederaAccountKey: hederaCred.hederaAccountKey,
                didDocument: didDocument.getPrivateDocument(),
            }
        } else {
            throw new Error('Unsupported action');
        }
    }

    /**
     * custom-logic-block
     */
    public static async generateId(options: {
        ref: AnyBlockType,
        type: string,
        user: PolicyUser,
        relayerAccount: string,
        userId: string | null
    }, actionStatusId?: string): Promise<string> {
        const { ref, type, user, userId } = options;
        try {
            if (type === 'UUID') {
                return await ref.components.generateUUID(actionStatusId);
            }
            if (type === 'OWNER') {
                return user.did;
            }
            if (type === 'DOCUMENT') {
                return undefined;
            }
            if (type === 'DID') {
                const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
                if (userCred.location === LocationType.LOCAL) {
                    return await GenerateDID.local(options, actionStatusId);
                } else {
                    const data = await GenerateDID.request(options);
                    return new Promise((resolve, reject) => {
                        const callback = async (action: PolicyAction) => {
                            if (action.status === PolicyActionStatus.COMPLETED) {
                                const result = await GenerateDID.complete(action, user, userId);
                                resolve(result)
                            } else {
                                reject(action.document);
                            }
                        }
                        const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                        controller.sendRequest(data, callback, userId).catch(reject).then();
                    });
                }
            }
            return undefined;
        } catch (error) {
            ref.error(`generateId: ${type} : ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    /**
     * custom-logic-block
     * request-vc-document-block-addon
     * request-vc-document-block
     * reassigning.block
     * tag-manager
     * multi-sign-block
     */
    public static async signVC(options: {
        ref: AnyBlockType,
        subject: any,
        issuer: string,
        relayerAccount: string,
        options: IDocumentOptions,
        userId: string | null
    }): Promise<VcDocumentDefinition> {
        const { ref, issuer, userId } = options;
        const userCred = await PolicyUtils.getUserCredentials(ref, issuer, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await SignVC.local(options);
        } else {
            const data = await SignVC.request(options);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SignVC.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * send-to-guardian-block
     * tag-manager
     * multi-sign-block
     */
    public static async sendMessage(options: {
        ref: AnyBlockType,
        topic: TopicConfig,
        message: Message,
        owner: string,
        relayerAccount: string,
        updateIpfs: boolean,
        userId: string | null
    }): Promise<Message> {
        const { ref, owner, userId } = options;
        const userCred = await PolicyUtils.getUserCredentials(ref, owner, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await SendMessage.local(options);
        } else {
            const data = await SendMessage.request(options);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SendMessage.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * revocation-block
     * revoke-block
     */
    public static async sendMessages(options: {
        ref: AnyBlockType,
        messages: Message[],
        owner: string,
        relayerAccount: string,
        updateIpfs: boolean,
        userId: string | null
    }): Promise<Message[]> {
        const { ref, owner, userId } = options;
        const userCred = await PolicyUtils.getUserCredentials(ref, owner, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await SendMessages.local(options);
        } else {
            const data = await SendMessages.request(options);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SendMessages.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * token-action-block
     */
    public static async associateToken(options: {
        ref: AnyBlockType,
        token: Token,
        user: string,
        relayerAccount: string,
        userId: string | null
    }): Promise<boolean> {
        const { ref, user, userId } = options;
        const userCred = await PolicyUtils.getUserCredentials(ref, user, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await AssociateToken.local(options);
        } else {
            const data = await AssociateToken.request(options);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await AssociateToken.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * token-action-block
     */
    public static async dissociateToken(options: {
        ref: AnyBlockType,
        token: Token,
        user: string,
        relayerAccount: string,
        userId: string | null
    }): Promise<boolean> {
        const { ref, user, userId } = options;
        const userCred = await PolicyUtils.getUserCredentials(ref, user, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await DissociateToken.local(options);
        } else {
            const data = await DissociateToken.request(options);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await DissociateToken.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * send-to-guardian-block
     */
    public static async getOrCreateTopic(options: {
        ref: AnyBlockType,
        name: string,
        owner: string,
        relayerAccount: string,
        memoObj: any,
        userId: string | null
    }): Promise<TopicConfig> {
        // Root topic
        const { ref, name, owner, relayerAccount, memoObj, userId } = options;
        if (!name || name === 'root') {
            return await PolicyActionsUtils.getRootTopic(ref, userId);
        }

        // Check config
        const policyTopics = ref.policyInstance.policyTopics || [];
        const config = policyTopics.find(e => e.name === name);
        if (!config) {
            throw new Error(`Topic '${name}' does not exist`);
        }

        // User topic
        const topicOwner: string = config.static ? ref.policyOwner : owner;

        const topic = await PolicyActionsUtils.getTopic(ref, name, topicOwner, userId);
        if (topic) {
            return topic;
        }

        return await PolicyActionsUtils.createTopic({
            ref,
            type: TopicType.DynamicTopic,
            config,
            owner: topicOwner,
            memoObj,
            relayerAccount: owner === topicOwner ? relayerAccount : null,
            userId
        });
    }

    public static async getRootTopic(
        ref: AnyBlockType,
        userId: string | null
    ): Promise<TopicConfig> {
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus, ref.policyAvailability);
        const rootTopic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.InstancePolicyTopic
            }), needKey, userId);
        return rootTopic;
    }

    public static async getTopic(
        ref: AnyBlockType,
        name: string,
        owner: string,
        userId: string | null
    ): Promise<TopicConfig> {
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus, ref.policyAvailability);
        const topic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.DynamicTopic,
                name,
                owner
            }), needKey, userId);
        return topic;
    }

    public static async getTopicById(
        ref: AnyBlockType,
        topicId: string,
        userId: string | null
    ): Promise<TopicConfig> {
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus, ref.policyAvailability);
        const topic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopicById(topicId),
            needKey,
            userId
        );
        return topic;
    }

    public static async createTopic(options: {
        ref: AnyBlockType,
        type: TopicType,
        config: any,
        owner: string,
        relayerAccount: string,
        memoObj: any,
        userId: string | null
    }): Promise<TopicConfig> {
        const { ref, owner, userId } = options;
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus, ref.policyAvailability);
        const userCred = await PolicyUtils.getUserCredentials(ref, owner, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await CreateTopic.local({ ...options, needKey });
        } else {
            const data = await CreateTopic.request(options);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await CreateTopic.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * external-topic-block
     */

    /**
     * group-manager
     */

    public static async setRelayerAccount(options: {
        ref: AnyBlockType,
        user: PolicyUser,
        relayerAccount: any,
        userId: string | null
    }): Promise<void> {
        const { ref, user } = options;
        const data = await RelayerAccountAction.request(options);
        const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
        await controller.sendRemoteAction(user, data)
    }

    public static async createPolicyDiscussion(options: {
        policyId: string,
        user: PolicyUser,
        discussion: PolicyDiscussion,
        key: string,
        userId: string | null
    }): Promise<PolicyDiscussion> {
        const { policyId, user } = options;
        const data = await PolicyDiscussionAction.request(options);
        const controller = PolicyComponentsUtils.getActionsController(policyId);
        return await controller.sendRemoteAction(user, data, true);
    }

    public static async createPolicyComment(options: {
        policyId: string,
        user: PolicyUser,
        comment: PolicyComment,
        userId: string | null
    }): Promise<PolicyComment> {
        const { policyId, user } = options;
        const data = await PolicyCommentAction.request(options);
        const controller = PolicyComponentsUtils.getActionsController(policyId);
        return await controller.sendRemoteAction(user, data, true);
    }
}