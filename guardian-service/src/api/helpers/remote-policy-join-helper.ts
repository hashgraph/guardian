import {
    createRemoteJoinDocument,
    DatabaseServer,
    ExternalPolicy,
    HederaDid,
    IAuthUser,
    KeyType,
    MessageServer,
    MessageType,
    PinoLogger,
    Policy,
    PolicyJoinMessage,
    PolicyMessage,
    REMOTE_POLICY_JOIN_TAG,
    resolveOwnerDidDocument,
    TopicConfig,
    Users,
    VcHelper,
    Wallet,
} from '@guardian/common';
import { ExternalPolicyStatus, ExternalPolicyType, GenerateUUIDv4, LocationType, RemoteJoinStatus, TopicType, UserRole } from '@guardian/interfaces';
import { PrivateKey } from '@hiero-ledger/sdk';

/**
 * Topic the DID document of a local user is published to
 * @param user
 */
export async function getUserDidTopicId(user: IAuthUser): Promise<string | null> {
    const db = new DatabaseServer();
    const didRow = await db.getDidDocument(user.did);
    if (didRow?.topicId) {
        return didRow.topicId;
    }
    const topic = await db.getTopic({ type: TopicType.UserTopic, owner: user.did })
        || await db.getTopic({ type: TopicType.UserTopic, owner: user.parent });
    return topic?.topicId || null;
}

/**
 * Load the message key of the user for the policy, or create and store a new one
 * @param did
 * @param policyMessageId
 * @param userId
 */
async function loadOrCreateMessageKey(did: string, policyMessageId: string, userId: string | null): Promise<string> {
    const wallet = new Wallet();
    const slot = `${did}#${policyMessageId}`;
    const existing = await wallet.getUserKey(did, KeyType.MESSAGE_KEY, slot, userId);
    if (existing) {
        return existing;
    }
    const keys = await DatabaseServer.getKeys({ messageId: policyMessageId, owner: did });
    if (!keys?.length) {
        await DatabaseServer.saveKey({ messageId: policyMessageId, owner: did });
    }
    const key = PrivateKey.generate().toString();
    await wallet.setUserKey(did, KeyType.MESSAGE_KEY, slot, key, userId);
    return key;
}

/**
 * Publish the join request of a user of this instance on the actions topic of a
 * remote policy. The request is paid by the user's account, signed with the user's
 * DID key, and carries the user's message key for the policy sealed to the DID key
 * of the policy owner.
 *
 * The join is sent once the policy is imported and assigned to the user: when the
 * import is approved, or when the user imports a policy that is already approved.
 * It is idempotent: a request that was sent or answered is not sent again, and the
 * stored message key is reused.
 *
 * @param policy - the VIEW copy of the policy
 * @param item - the import request of the user
 * @param logger
 * @param retryRejected - send again after a rejection (the user imported the policy again)
 * @param force - send a new join even if one was answered (the user imported the policy
 * again after disconnecting from it, the new join reconnects the user on the Main instance)
 */
export async function sendRemotePolicyJoin(
    policy: Policy,
    item: ExternalPolicy,
    logger: PinoLogger,
    retryRejected: boolean = false,
    force: boolean = false
): Promise<ExternalPolicy> {
    if (
        !policy?.actionsTopicId ||
        !item?.creator ||
        item.status !== ExternalPolicyStatus.APPROVED ||
        (item.type && item.type !== ExternalPolicyType.IMPORT)
    ) {
        return item;
    }
    if (
        !force &&
        item.joinMessageId && (
            item.joinStatus === RemoteJoinStatus.SENT ||
            item.joinStatus === RemoteJoinStatus.ACCEPTED ||
            (item.joinStatus === RemoteJoinStatus.REJECTED && !retryRejected)
        )
    ) {
        return item;
    }
    const users = new Users();
    let user: IAuthUser | null = null;
    try {
        user = await users.getUserById(item.creator, null);
        if (user && user.role !== UserRole.USER) {
            // a Standard Registry views the policy, it does not take part in it
            return item;
        }
        if (!user?.did || !user.hederaAccountId || user.location === LocationType.REMOTE) {
            throw new Error('The user has no Hedera account on this instance.');
        }
        const policyMessageId = policy.messageId;
        const root = await users.getHederaAccount(user.did, user.id);

        const policyMessage = await MessageServer.getMessage<PolicyMessage>({
            messageId: policyMessageId,
            loadIPFS: false,
            type: MessageType.InstancePolicy,
            userId: user.id,
            interception: null
        });
        const ownerDid = policyMessage?.owner;
        if (!ownerDid || !policyMessage.payer) {
            throw new Error('Policy owner is unknown.');
        }
        const ownerTopicId = HederaDid.parse(ownerDid).topicId?.toString();
        // the owner's DID topic usually has a submit key; an open topic falls back to the payer of the policy
        const ownerDidDocument = await resolveOwnerDidDocument(
            ownerDid,
            ownerTopicId,
            policyMessage.payer,
            user.id
        );

        const topicId = await getUserDidTopicId(user);
        const userDidDocument = await new VcHelper().loadDidDocument(user.did, user.id);
        const messageKey = await loadOrCreateMessageKey(user.did, policyMessageId, user.id);
        const document = createRemoteJoinDocument(
            userDidDocument,
            ownerDidDocument,
            root.hederaAccountId,
            topicId,
            policyMessageId,
            messageKey
        );

        const topic = await TopicConfig.fromObject(
            await DatabaseServer.getTopicById(policy.actionsTopicId), false, user.id
        );
        if (!topic) {
            throw new Error('Invalid action topic');
        }
        const message = new PolicyJoinMessage();
        message.setDocument({
            uuid: GenerateUUIDv4(),
            owner: user.did,
            policyId: policy.id,
            accountId: root.hederaAccountId,
            relayerAccount: null,
            blockTag: REMOTE_POLICY_JOIN_TAG,
            startMessageId: null
        } as any, document);
        const messageServer = new MessageServer({
            operatorId: root.hederaAccountId,
            operatorKey: root.hederaAccountKey,
            signOptions: root.signOptions
        });
        const result = await messageServer
            .setTopicObject(topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId: user.id,
                interception: null
            });

        item.joinStatus = RemoteJoinStatus.SENT;
        item.joinMessageId = result.getId();
        item.joinReplyMessageId = null;
        item.joinError = null;
    } catch (error) {
        await logger.error(`Failed to send the join request: ${error?.message || error}`, ['GUARDIAN_SERVICE'], user?.id);
        item.joinStatus = RemoteJoinStatus.FAILED;
        item.joinError = String(error?.message || error);
    }
    return await DatabaseServer.updateExternalPolicy(item);
}

/**
 * Send the join requests of all users who imported the policy
 * @param policy
 * @param items
 * @param logger
 */
export async function sendRemotePolicyJoins(
    policy: Policy,
    items: ExternalPolicy[],
    logger: PinoLogger
): Promise<void> {
    if (!policy || !items) {
        return;
    }
    for (const item of items) {
        await sendRemotePolicyJoin(policy, item, logger);
    }
}
