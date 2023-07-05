import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import {
    AnyBlockType,
    IPolicyEventState,
    IPolicyInterfaceBlock,
} from '@policy-engine/policy-engine.interface';
import { Message, MessageServer } from '@guardian/common';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import {
    IPolicyEvent,
    PolicyInputEventType,
    PolicyOutputEventType,
} from '@policy-engine/interfaces';
import {
    ChildrenType,
    ControlType,
    PropertyType,
} from '@policy-engine/interfaces/block-about';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import {
    ExternalDocuments,
    ExternalEvent,
    ExternalEventType,
} from '@policy-engine/interfaces/external-event';

export const RevokedStatus = 'Revoked';

/**
 * Revocation block
 */
@BasicBlock({
    blockType: 'revocationBlock',
    about: {
        label: 'Revocation',
        title: `Add 'Revocation' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [PolicyInputEventType.RunEvent],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.ErrorEvent,
        ],
        defaultEvent: true,
        properties: [
            {
                name: 'updatePrevDoc',
                label: 'Update previous document status',
                title: 'Update previous document status',
                type: PropertyType.Checkbox,
                default: false,
            },
            {
                name: 'prevDocStatus',
                label: 'Status value',
                title: 'Status value',
                type: PropertyType.Input,
                default: '',
            },
        ],
    },
})
export class RevocationBlock {
    /**
     * Send to hedera
     * @param message
     * @param messageServer
     * @param ref
     * @param revokeMessage
     * @param parentId
     */
    async sendToHedera(
        message: Message,
        messageServer: MessageServer,
        ref: AnyBlockType,
        revokeMessage: string,
        parentId?: string[]
    ) {
        const topic = await PolicyUtils.getPolicyTopic(ref, message.topicId);
        message.revoke(revokeMessage, parentId);
        await messageServer.setTopicObject(topic).sendMessage(message, false);
    }

    /**
     * Find related message Ids
     * @param topicMessage
     * @param topicMessages
     * @param relatedMessageIds
     * @param parentId
     */
    async findRelatedMessageIds(
        topicMessage: any,
        topicMessages: any[],
        relatedMessageIds: any[] = [],
        parentId?: string
    ): Promise<any[]> {
        if (!topicMessage) {
            throw new Error('Topic message to find related messages is empty');
        }
        const relatedMessages = topicMessages.filter(
            (message: any) =>
                message.relationships &&
                message.relationships.includes(topicMessage.id)
        );
        for (const relatedMessage of relatedMessages) {
            await this.findRelatedMessageIds(
                relatedMessage,
                topicMessages,
                relatedMessageIds,
                topicMessage.id
            );
        }
        const relatedMessageId = relatedMessageIds.find(
            (item) => item.id === topicMessage.id
        );
        if (!relatedMessageId) {
            relatedMessageIds.push({
                parentIds: parentId ? [parentId] : undefined,
                id: topicMessage.id,
            });
        } else if (
            relatedMessageId.parentIds &&
            !relatedMessageId.parentIds.includes(parentId)
        ) {
            relatedMessageId.parentIds.push(parentId);
        }
        return relatedMessageIds;
    }

    /**
     * Find document by message ids
     * @param messageIds
     */
    async findDocumentByMessageIds(messageIds: string[]): Promise<any[]> {
        const ref =
            PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);
        const filters: any = {
            messageId: { $in: messageIds },
        };
        const otherOptions = {
            orderBy: {
                messageId: 'ASC',
            },
        };
        const vcDocuments: any[] = (await ref.databaseServer.getVcDocuments(
            filters,
            otherOptions
        )) as any[];
        const vpDocuments: any[] = (await ref.databaseServer.getVpDocuments(
            filters,
            otherOptions
        )) as any[];
        const didDocuments: any[] = (await ref.databaseServer.getDidDocuments(
            filters,
            otherOptions
        )) as any[];
        return vcDocuments.concat(vpDocuments).concat(didDocuments);
    }

    /**
     * Run block action
     * @param event
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.ErrorEvent,
        ],
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>): Promise<any> {
        const ref =
            PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);
        const data = event.data.data;
        const doc = Array.isArray(data) ? data[0] : data;

        const hederaAccount = await PolicyUtils.getHederaAccount(
            ref,
            event.user.did
        );
        const messageServer = new MessageServer(
            hederaAccount.hederaAccountId,
            hederaAccount.hederaAccountKey,
            ref.dryRun
        );
        const policyTopics = await ref.databaseServer.getTopics({
            policyId: ref.policyId,
        });

        const policyTopicsMessages = [];
        for (const topic of policyTopics) {
            const topicMessages = await messageServer.getMessages(
                topic.topicId
            );
            policyTopicsMessages.push(...topicMessages);
        }
        const messagesToFind = policyTopicsMessages.filter(
            (item) => !item.isRevoked()
        );

        const topicMessage = policyTopicsMessages.find(
            (item) => item.id === doc.messageId
        );

        const relatedMessages = await this.findRelatedMessageIds(
            topicMessage,
            messagesToFind
        );
        for (const policyTopicMessage of policyTopicsMessages) {
            const relatedMessage = relatedMessages.find(
                (item) => item.id === policyTopicMessage.id
            );
            if (relatedMessage) {
                await this.sendToHedera(
                    policyTopicMessage,
                    messageServer,
                    ref,
                    doc.comment,
                    relatedMessage.parentIds
                );
            }
        }

        const documents = await this.findDocumentByMessageIds(
            relatedMessages.map((item) => item.id)
        );
        for (const item of documents) {
            item.option = item.option || {};
            item.option.status = RevokedStatus;
            item.comment = doc.option.comment;
            if (Array.isArray(item.comment)) {
                item.comment = item.comment[item.comment.length - 1];
            }
            if (item.option.comment) {
                if (Array.isArray(item.option.comment)) {
                    item.option.comment.push(item.comment);
                }
            } else {
                item.option.comment = [item.comment];
            }
        }

        if (ref.options.updatePrevDoc && doc.relationships) {
            const prevDocs = await this.findDocumentByMessageIds(
                doc.relationships
            );
            const prevDocument = prevDocs[prevDocs.length - 1];
            if (prevDocument) {
                prevDocument.option.status = ref.options.prevDocStatus;
                await ref.databaseServer.updateVC(prevDocument);
                await ref.databaseServer.saveDocumentState({
                    documentId: prevDocument.id,
                    document: prevDocument,
                });
            }
        }

        const state: IPolicyEventState = {
            data: documents,
        };
        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, state);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);

        PolicyComponentsUtils.ExternalEventFn(
            new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
                documents: ExternalDocuments(documents),
            })
        );
    }
}
