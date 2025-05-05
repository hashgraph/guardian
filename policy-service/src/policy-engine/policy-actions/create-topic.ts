import { PolicyAction, TopicConfig, TopicHelper } from '@guardian/common';
import { GenerateUUIDv4, TopicType } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyActionType } from './policy-action.type.js';

export class CreateTopic {
    public static async local(
        ref: AnyBlockType,
        type: TopicType,
        config: any,
        owner: string,
        memoObj: any,
        needKey: boolean,
        userId: string | null
    ): Promise<TopicConfig> {
        const rootTopic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.InstancePolicyTopic
            }), !ref.dryRun, userId);

        const userCred = await PolicyUtils.getUserCredentials(ref, owner, userId);
        const userHederaCred = await userCred.loadHederaCredentials(ref, userId);
        const userSignOptions = await userCred.loadSignOptions(ref, userId);
        const topicHelper = new TopicHelper(
            userHederaCred.hederaAccountId,
            userHederaCred.hederaAccountKey,
            userSignOptions,
            ref.dryRun,
        );
        const topic = await topicHelper.create({
            type,
            owner,
            name: config.name,
            description: config.description,
            policyId: ref.policyId,
            policyUUID: null,
            memo: config.memo,
            memoObj: config.memoObj === 'doc' ? memoObj : config
        }, userId, {
            admin: needKey,
            submit: needKey
        });
        if (needKey) {
            await topic.saveKeys(userId);
        }
        await topicHelper.twoWayLink(topic, rootTopic, null);
        await ref.databaseServer.saveTopic(topic.toObject());
        return topic;
    }

    public static async request(
        ref: AnyBlockType,
        type: TopicType,
        config: any,
        owner: string,
        memoObj: any,
        userId: string | null
    ): Promise<any> {
        const rootTopic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.InstancePolicyTopic
            }), !ref.dryRun, userId);

        const userAccount = await PolicyUtils.getHederaAccountId(ref, owner, userId);
        const data = {
            uuid: GenerateUUIDv4(),
            owner,
            accountId: userAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.CreateTopic,
                owner,
                parent: rootTopic.toObject(),
                topic: {
                    type,
                    owner,
                    name: config.name,
                    description: config.description,
                    policyId: ref.policyId,
                    policyUUID: null,
                    memo: config.memo,
                    memoObj: config.memoObj === 'doc' ? memoObj : config
                },
            }
        };
        return data;
    }

    public static async response(
        row: PolicyAction,
        user: PolicyUser,
        userId: string | null
    ) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const { parent, topic } = data;

        const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
        const userHederaCred = await userCred.loadHederaCredentials(ref, userId);
        const userSignOptions = await userCred.loadSignOptions(ref, userId);
        const topicHelper = new TopicHelper(
            userHederaCred.hederaAccountId,
            userHederaCred.hederaAccountKey,
            userSignOptions,
            ref.dryRun,
        );
        const topicConfig = await topicHelper.create(topic, userId, {
            admin: false,
            submit: false
        });

        const parentConfig = await TopicConfig.fromObject(parent, false, userId);

        await topicHelper.twoWayLink(topicConfig, parentConfig, null);
        await ref.databaseServer.saveTopic(topicConfig.toObject());

        return {
            type: PolicyActionType.CreateTopic,
            owner: user.did,
            topic: topicConfig.toObject()
        };
    }

    public static async complete(
        row: PolicyAction,
        userId: string | null
    ): Promise<TopicConfig> {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const { topic } = data;
        const topicConfig = await TopicConfig.fromObject(topic, false, userId);
        await ref.databaseServer.saveTopic(topicConfig.toObject());
        return topicConfig;
    }

    public static async validate(
        request: PolicyAction,
        response: PolicyAction,
        userId: string | null
    ): Promise<boolean> {
        try {
            if (request && response && request.accountId === response.accountId) {
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }
}
