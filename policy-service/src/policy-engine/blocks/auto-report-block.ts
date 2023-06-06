import { Report } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { AnyBlockType, IPolicyReportBlock } from '@policy-engine/policy-engine.interface';
import { BlockActionError } from '@policy-engine/errors';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import { MessageAction, MessageServer, MessageType, SchemaMessage, TopicMessage, UrlType, VCMessage, VPMessage } from '@guardian/common';
import { TopicType } from '@guardian/interfaces';

interface IReport {

}

class MessagesReport {
    private topics: Map<string, any>;
    private messages: Map<string, any>;
    private schemas: Map<string, any>;

    constructor() {
        this.topics = new Map<string, any>();
        this.messages = new Map<string, any>();
        this.schemas = new Map<string, any>();
    }

    public async start(messageId: string) {
        await this.checkMessage(messageId);
    }

    private async checkMessage(timestamp: string) {
        if (this.messages.has(timestamp)) {
            return;
        }
        this.messages.set(timestamp, null);

        const message = await MessageServer.getMessage(timestamp);
        if (!message) {
            return;
        }

        if (message.type === MessageType.VCDocument || message.type === MessageType.VPDocument) {
            await MessageServer.loadDocument(message);
        }

        this.messages.set(timestamp, message.toJson());

        await this.checkTopic(message.getTopicId());

        for (const id of message.getRelationships()) {
            await this.checkMessage(id);
        }
    }

    private async checkTopic(topicId: string) {
        if (this.topics.has(topicId)) {
            return;
        }
        this.topics.set(topicId, null);

        const message = await MessageServer.getTopic(topicId);
        if (!message) {
            return;
        }

        this.topics.set(topicId, message.toJson());

        if (message.parentId) {
            await this.checkTopic(message.parentId);
        }
        if (message.rationale) {
            await this.checkMessage(message.rationale);
        }

        await this.checkSchemas(message);
    }

    private async checkSchemas(message: TopicMessage) {
        if (message.messageType === TopicType.PolicyTopic) {
            const messages: any[] = await MessageServer.getMessages(message.getTopicId());
            const schemas: SchemaMessage[] = messages.filter((m: SchemaMessage) =>
                m.action === MessageAction.PublishSchema ||
                m.action === MessageAction.PublishSystemSchema);
            for (const schema of schemas) {
                const id = schema.getContextUrl(UrlType.url);
                if (!this.schemas.has(id)) {
                    await MessageServer.loadDocument(schema);
                    this.schemas.set(id, schema.toJson());
                }
            }
        }
    }

    public toJson(): any {
        const topicsMap = new Map<string, any>();
        for (const [topicId, message] of this.topics.entries()) {
            const parent = message?.parentId;
            topicsMap.set(topicId, {
                topicId,
                message,
                parent,
                children: [],
                messages: [],
            });
        }
        const topics = [];
        for (const topic of topicsMap.values()) {
            if (topicsMap.has(topic.parent)) {
                topicsMap.get(topic.parent).children.push(topic);
            } else {
                topics.push(topic);
            }
        }
        const messages = [];
        for (const message of this.messages.values()) {
            if (message && topicsMap.has(message.topicId)) {
                messages.push(message);
                topicsMap.get(message.topicId).messages.push(message);
            }
        }
        messages.sort((a, b) => a.id > b.id ? 1 : -1);
        for (let index = 0; index < messages.length; index++) {
            messages[index].order = index;
        }
        const schemas = [];
        for (const schema of this.schemas.values()) {
            schemas.push(schema);
        }
        const result: any = {
            topics,
            schemas
        };
        return result;
    }
}

/**
 * Report block
 */
@Report({
    blockType: 'autoReportBlock',
    commonBlock: false,
    about: {
        label: 'Report',
        title: `Add 'Report' Block`,
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.RefreshEvent,
        ],
        output: null,
        defaultEvent: false
    },
    variables: []
})
export class AutoReportBlock {
    private readonly USER_FILTER_VALUE = 'USER_FILTER_VALUE';
    private readonly USER_REPORT = 'USER_REPORT';
    private readonly USER_REPORT_STATUS = 'USER_REPORT_STATUS';

    /**
     * Update user state
     * @private
     */
    private updateStatus(ref: AnyBlockType, status: string, user: IPolicyUser) {
        ref.updateBlock({ status: status }, user);
    }

    private async createReport(user: IPolicyUser, messageId: string): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);
        try {
            const report = new MessagesReport();
            await report.start(messageId);
            await ref.setCache<IReport>(this.USER_REPORT, report.toJson(), user);
            await ref.setCache<string>(this.USER_REPORT_STATUS, 'FINISHED', user);
            this.updateStatus(ref, 'FINISHED', user);
        } catch (error) {
            await ref.setCache<string>(this.USER_REPORT_STATUS, 'FAILED', user);
            this.updateStatus(ref, 'FAILED', user);
        }
    }

    /**
     * Get block data
     * @param user
     * @param uuid
     */
    async getData(user: IPolicyUser, uuid: string): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            const report = await ref.getCache<IReport>(this.USER_REPORT, user);
            const status = await ref.getCache<IReport>(this.USER_REPORT_STATUS, user);
            return {
                report,
                status
            };
        } catch (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    async setData(user: IPolicyUser, data: any) {
        console.log('!--- setData', data);
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);
        try {
            const value: string = data.filterValue;
            await ref.setCache<string>(this.USER_FILTER_VALUE, value, user);
            await ref.setCache<string>(this.USER_REPORT, null, user);
            await ref.setCache<string>(this.USER_REPORT_STATUS, 'STARTED', user);

            this.createReport(user, value).then();

            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
                value
            }));
        } catch (error) {
            console.log('!--- setData', error);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }
}
