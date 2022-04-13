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
import { TopicHelper } from '@helpers/topicHelper';
import { PolicyUtils } from '@policy-engine/helpers/utils';

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
                const doc: any = {
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
                result = await PolicyUtils.updateVCRecord(doc);
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
        try {
            const root = await this.users.getHederaAccount(ref.policyOwner);
            const user = await this.users.getHederaAccount(document.owner);
            const topic = await PolicyUtils.getTopic(ref.options.topic, root, user, ref);
            const vc = HVcDocument.fromJsonTree(document.document);
            const vcMessage = new VCMessage(MessageAction.CreateVC);
            vcMessage.setDocument(vc);
            const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey);
            const vcMessageResult = await messageServer
                .setTopicObject(topic)
                .sendMessage(vcMessage);
            document.hederaStatus = DocumentStatus.ISSUE;
            document.messageId = vcMessageResult.getId();
            return document;
        } catch (error) {
            throw new BlockActionError(error.message, ref.blockType, ref.uuid)
        }
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!['vc-documents', 'did-documents', 'approve', 'hedera'].find(item => item === ref.options.dataType)) {
                resultsContainer.addBlockError(ref.uuid, 'Option "dataType" must be one of vc-documents, did-documents, approve, hedera');
            }
            if (ref.options.dataType == 'hedera') {
                if (ref.options.topic && ref.options.topic !== 'root') {
                    const policyTopics = ref.policyInstance.policyTopics || [];
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
