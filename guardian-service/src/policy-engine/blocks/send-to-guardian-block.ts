import { BlockActionError } from '@policy-engine/errors';
import { BasicBlock } from '@policy-engine/helpers/decorators';
import { DocumentSignature, DocumentStatus, TopicType } from 'interfaces';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { KeyType, Wallet } from '@helpers/wallet';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';
import { IAuthUser } from '@auth/auth.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { MessageAction, MessageServer, VcDocument as HVcDocument, VCMessage } from '@hedera-modules';
import { getMongoRepository } from 'typeorm';
import { VcDocument } from '@entity/vc-document';
import { DidDocument } from '@entity/did-document';
import { ApprovalDocument } from '@entity/approval-document';
import { Topic } from '@entity/topic';
import { Policy } from '@entity/policy';
import { TopicHelper } from '@helpers/topicHelper';

@BasicBlock({
    blockType: 'sendToGuardianBlock',
    commonBlock: true
})
export class SendToGuardianBlock {
    @Inject()
    private wallet: Wallet;

    @Inject()
    private users: Users;

    async documentSender(state, user: IAuthUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        let document = state.data;
        document.policyId = ref.policyId;
        document.tag = ref.tag;
        document.type = ref.options.entityType;

        if (ref.options.forceNew) {
            document = { ...document };
            document.id = undefined;
            state.data = document;
        }
        if (ref.options.options) {
            document.option = document.option || {};
            for (let index = 0; index < ref.options.options.length; index++) {
                const option = ref.options.options[index];
                document.option[option.name] = option.value;
            }
        }

        ref.log(`Send Document: ${JSON.stringify(document)}`);

        let result: any;
        switch (ref.options.dataType) {
            case 'vc-documents': {
                const vc = HVcDocument.fromJsonTree(document.document);
                const doc = {
                    hash: vc.toCredentialHash(),
                    owner: document.owner,
                    assign: document.assign,
                    option: document.option,
                    schema: document.schema,
                    hederaStatus: document.status || DocumentStatus.NEW,
                    signature: document.signature || DocumentSignature.NEW,
                    type: ref.options.entityType,
                    policyId: ref.policyId,
                    tag: ref.tag,
                    document: vc.toJsonTree()
                };
                let item = await getMongoRepository(VcDocument).findOne({ hash: doc.hash });
                if (item) {
                    item.owner = doc.owner;
                    item.assign = doc.assign;
                    item.option = doc.option;
                    item.schema = doc.schema;
                    item.hederaStatus = doc.hederaStatus;
                    item.signature = doc.signature;
                    item.type = doc.type;
                    item.tag = doc.tag;
                    item.document = doc.document;
                } else {
                    item = getMongoRepository(VcDocument).create(doc);
                }
                result = await getMongoRepository(VcDocument).save(item);
                break;
            }
            case 'did-documents': {
                let item = await getMongoRepository(DidDocument).findOne({ did: document.did });
                if (item) {
                    item.document = document.document;
                    item.status = document.status;
                } else {
                    item = getMongoRepository(DidDocument).create(document as DidDocument);
                }
                result = await getMongoRepository(DidDocument).save(item);
                break;
            }
            case 'approve': {
                let item: ApprovalDocument;
                if (document.id) {
                    item = await getMongoRepository(ApprovalDocument).findOne(document.id);
                }
                if (item) {
                    item.owner = document.owner;
                    item.option = document.option;
                    item.schema = document.schema;
                    item.document = document.document;
                    item.tag = document.tag;
                    item.type = document.type;
                } else {
                    item = getMongoRepository(ApprovalDocument).create(document as ApprovalDocument);
                }
                result = await getMongoRepository(ApprovalDocument).save(item);
                break;
            }
            case 'hedera': {
                result = await this.sendToHedera(document, ref);
                break;
            }
            default:
                throw new BlockActionError(`dataType "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
        }

        return result;
    }

    @CatchErrors()
    async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`runAction`);
        await this.documentSender(state, user);
        await ref.runNext(user, state);
        PolicyComponentsUtils.CallDependencyCallbacks(ref.tag, ref.policyId, user);
        PolicyComponentsUtils.CallParentContainerCallback(ref, user);
        // ref.updateBlock(state, user, '');
    }

    async sendToHedera(document: any, ref: IPolicyBlock) {
        const userFull = await this.users.getUserById(document.owner);
        const userID = userFull.hederaAccountId;
        const userDID = userFull.did;
        const userKey = await this.wallet.getKey(userFull.walletToken, KeyType.KEY, userDID);

        const topic = await this.getTopic(ref, userDID, userID, userKey);
        const vc = HVcDocument.fromJsonTree(document.document);
        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(vc);
        const messageServer = new MessageServer(userID, userKey);
        messageServer.setSubmitKey(topic.key);
        await messageServer.sendMessage(topic.topicId, vcMessage)
        document.hederaStatus = DocumentStatus.ISSUE;
        return document;
    }

    async getTopic(ref: IPolicyBlock, userDID: string, userID: string, userKey: string): Promise<Topic> {
        const rootTopic = await getMongoRepository(Topic).findOne({
            policyId: ref.policyId,
            type: TopicType.RootPolicyTopic
        });

        let topic: any;
        if (ref.options.topic && ref.options.topic !== 'root') {
            const policy = await getMongoRepository(Policy).findOne(ref.policyId);
            const root = await this.users.getHederaAccount(ref.policyOwner);
            const policyTopics = policy.policyTopics || [];
            const config = policyTopics.find(e => e.name == ref.options.topic);
            if (!config) {
                throw new BlockActionError(`Topic "${ref.options.topic}" does not exist`, ref.blockType, ref.uuid)
            }

            const topicOwner = config.static ? root.did : userDID;
            const topicAccountId = config.static ? root.hederaAccountId : userID;
            const topicAccountKey = config.static ? root.hederaAccountKey : userKey;

            topic = await getMongoRepository(Topic).findOne({
                policyId: ref.policyId,
                type: TopicType.ProjectTopic,
                name: ref.options.topic,
                owner: topicOwner
            });
            if (!topic) {
                const topicHelper = new TopicHelper(topicAccountId, topicAccountKey);
                topic = await topicHelper.create({
                    type: TopicType.ProjectTopic,
                    owner: topicOwner,
                    name: config.name,
                    description: config.description,
                    policyId: ref.policyId,
                    policyUUID: null
                });
                await topicHelper.link(topic, rootTopic);
            }
        } else {
            topic = rootTopic;
        }

        return topic;
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!['vc-documents', 'did-documents', 'approve', 'hedera'].find(item => item === ref.options.dataType)) {
                resultsContainer.addBlockError(ref.uuid, 'Option "dataType" must be one of vc-documents, did-documents, approve, hedera');
            }
            if (ref.options.dataType == 'hedera') {
                if (ref.options.topic && ref.options.topic !== 'root') {
                    const policy = await getMongoRepository(Policy).findOne(ref.policyId);
                    const policyTopics = policy.policyTopics || [];
                    const config = policyTopics.find(e => e.name == ref.options.topic);
                    if (!config) {
                        resultsContainer.addBlockError(ref.uuid, 'Topic "${ref.options.topic}" does not exist');
                    }
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
