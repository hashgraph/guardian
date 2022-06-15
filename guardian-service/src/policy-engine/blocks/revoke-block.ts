import { ActionCallback, BasicBlock, EventBlock } from '@policy-engine/helpers/decorators';
import { IAuthUser } from '@auth/auth.interface';
import { Inject } from '@helpers/decorators/inject';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { getMongoRepository } from 'typeorm';
import { Users } from '@helpers/users';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { AnyBlockType, IPolicyInterfaceBlock } from '@policy-engine/policy-engine.interface';
import { Message, MessageServer } from '@hedera-modules';
import { VcDocument } from '@entity/vc-document';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { DocumentState } from '@entity/document-state';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { VpDocument } from '@entity/vp-document';
import { DidDocument } from '@entity/did-document';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';

export const RevokedStatus = 'Revoked';

/**
 * Revoke document action with UI
 */
 @BasicBlock({
    blockType: 'revokeBlock',
    about: {
        label: 'Revoke Document',
        title: `Add 'Revoke' Block`,
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent
        ],
        defaultEvent: true
    }
})
@EventBlock({
    blockType: 'revokeBlock',
    commonBlock: false,
})
export class RevokeBlock {
    @Inject()
    private users: Users;

    async sendToHedera(
        message: Message, 
        messageServer: MessageServer, 
        ref: AnyBlockType, 
        revokeMessage: string, 
        parentId?: string[]
    ) {
        const topic = await PolicyUtils.getTopicById(message.topicId.toString(), ref);
        message.revoke(revokeMessage, parentId);
        await messageServer
            .setTopicObject(topic)
            .sendMessage(message, false);
    }

    async findRelatedMessageIds(
        topicMessage: any, 
        topicMessages: any[], 
        relatedMessageIds: any[]= [],
        parentId?: string
    ): Promise<any[]> {
        if (!topicMessage) {
            throw new Error('Topic message to find related messages is empty');
        }
        const relatedMessages = topicMessages.filter(
            (message: any) => (message.relationships && message.relationships.includes(topicMessage.id))
        );
        for (const relatedMessage of relatedMessages) {
            await this.findRelatedMessageIds(
                relatedMessage, 
                topicMessages, 
                relatedMessageIds, 
                topicMessage.id
            );
        }
        const relatedMessageId = relatedMessageIds.find(item => item.id === topicMessage.id);
        if (!relatedMessageId) {
            relatedMessageIds.push({
                parentIds: parentId ? [parentId] : undefined,
                id: topicMessage.id
            });
        } else if (relatedMessageId.parentIds && !relatedMessageId.parentIds.includes(parentId)){
            relatedMessageId.parentIds.push(parentId);
        }
        return relatedMessageIds;
    }

    async findDocumentByMessageIds(messageIds: string[]): Promise<any[]> {
        const filters: any = {
            where: {
                messageId: { $in: messageIds }
            },
            order: {
                messageId: "ASC"
            }
        };
        const vcDocuments: any[] = await getMongoRepository(VcDocument).find(filters);
        const vpDocuments: any[] = await getMongoRepository(VpDocument).find(filters);
        const didDocuments: any[] = await getMongoRepository(DidDocument).find(filters);
        return vcDocuments.concat(vpDocuments).concat(didDocuments);
    }


    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<any>): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);
        const uiMetaData = ref.options.uiMetaData;
        const data = event.data.data;
        const hederaAccount = await this.users.getHederaAccount(event.user.did);
        const messageServer = new MessageServer(hederaAccount.hederaAccountId, hederaAccount.hederaAccountKey);
        const policyTopics = await PolicyUtils.getPolicyTopics(ref.policyId);
        const policyTopicsMessages = [];
        for (const topicId of policyTopics.map(topic => topic.topicId)) {
            const topicMessages = await messageServer.getMessages(topicId);
            policyTopicsMessages.push(...topicMessages);
        }
        const revokedMessagesIds = policyTopicsMessages
            .filter(item => item.isRevoked())
            .map(item => item.getMessageId());
        const messagesToFind = policyTopicsMessages
            .filter(item => !revokedMessagesIds.includes(item.getMessageId()));
        const topicMessage = policyTopicsMessages.find(item => item.id == data.messageId);
        const relatedMessages = await this.findRelatedMessageIds(topicMessage, messagesToFind);
        for (const policyTopicMessage of policyTopicsMessages) {
            const relatedMessage = relatedMessages.find(item=> item.id === policyTopicMessage.id);
            if (relatedMessage) {
                await this.sendToHedera(
                    policyTopicMessage, 
                    messageServer, 
                    ref, 
                    data.comment, 
                    relatedMessage.parentIds
                );
            }
        }
        const documents = await this.findDocumentByMessageIds(relatedMessages.map(item => item.id));
        for (const doc of documents) {
            doc.option = doc.option || {};
            doc.option.status = RevokedStatus;
            doc.comment = data.comment;
        }
        if (uiMetaData && uiMetaData.updatePrevDoc && data.relationships) {
            const prevDocs = await this.findDocumentByMessageIds(data.relationships);
            const prevDocument = prevDocs[prevDocs.length-1];
            if (prevDocument) {
                prevDocument.option.status = uiMetaData.prevDocStatus;
                await getMongoRepository(VcDocument).update(prevDocument.id, prevDocument);
                const docStatusRepo = getMongoRepository(DocumentState);
                docStatusRepo.save({
                    documentId: prevDocument.id,
                    status: uiMetaData.prevDocStatus
                });
            }
        }
        const state = {
            data: documents
        };
        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, state);
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!ref.options.uiMetaData || (typeof ref.options.uiMetaData !== 'object')) {
                resultsContainer.addBlockError(ref.uuid, 'Option "uiMetaData" does not set');
                return;
            }

            if (!ref.options.uiMetaData.name) {
                resultsContainer.addBlockError(ref.uuid, 'Option "Button Name" does not set');
            }

            if (!ref.options.uiMetaData.title) {
                resultsContainer.addBlockError(ref.uuid, 'Option "Title" does not set');
            }

            if (!ref.options.uiMetaData.description) {
                resultsContainer.addBlockError(ref.uuid, 'Option "Description" does not set');
            }

            if (ref.options.uiMetaData.updatePrevDoc && !ref.options.uiMetaData.prevDocStatus) {
                resultsContainer.addBlockError(ref.uuid, 'Option "Status Value" does not set');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
