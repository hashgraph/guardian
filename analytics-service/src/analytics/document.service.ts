import {
    DIDMessage,
    DataBaseHelper,
    Message,
    MessageType,
    RoleMessage,
    TopicMessage,
    VCMessage,
    VPMessage
} from '@guardian/common';
import { AnalyticsStatus as Status } from '../entity/analytics-status';
import { AnalyticsPolicyInstance as PolicyInstance } from '../entity/analytics-policy-instance';
import { AnalyticsDocument as Document } from '../entity/analytics-document';
import { AnalyticsTopic as Topic } from '../entity/analytics-topic';

import { ReportSteep } from '../interfaces/report-steep.type';
import { ReportStatus } from '../interfaces/report-status.type';
import { AnalyticsUtils } from '../utils/utils';
import { DocumentType } from '../interfaces/document.type';
import { Tasks } from '../utils/tasks';

export class AnalyticsDocumentService {
    private static readonly CHUNKS_COUNT = 10;

    private static parsDocumentMessage(message: any): Message {
        try {
            if (typeof message.message !== 'string' || !message.message.startsWith('{')) {
                return;
            }
            const json = JSON.parse(message.message);
            let item: Message;

            if (json.type === MessageType.VCDocument || json.type === MessageType.EVCDocument) {
                item = VCMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.VPDocument) {
                item = VPMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.RoleDocument) {
                item = RoleMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.DIDDocument) {
                item = DIDMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Topic) {
                item = TopicMessage.fromMessageObject(json);
            }
            if (item && item.validate()) {
                item.setAccount(message.payer_account_id);
                item.setIndex(message.sequence_number);
                item.setId(message.id);
                item.setTopicId(message.topicId);
                return item;
            }
            return null;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    public static async searchByInstance(
        report: Status,
        topicId: string,
        instance: PolicyInstance | Topic,
        skip: boolean = false
    ): Promise<Status> {
        try {
            return await AnalyticsUtils.searchMessages(report, topicId, skip, async (message) => {
                const data: any = AnalyticsDocumentService.parsDocumentMessage(message);
                if (data) {
                    if (data.type === MessageType.VCDocument || data.type === MessageType.EVCDocument) {
                        const row = new DataBaseHelper(Document).create({
                            uuid: report.uuid,
                            root: report.root,
                            policyUUID: instance.policyUUID,
                            policyTopicId: instance.policyTopicId,
                            instanceTopicId: instance.instanceTopicId,
                            timeStamp: data.id,
                            account: data.payer,
                            type: DocumentType.VC,
                            issuer: data.issuer,
                            action: data.action
                        });
                        await new DataBaseHelper(Document).save(row);
                    }
                    if (data.type === MessageType.VPDocument) {
                        const row = new DataBaseHelper(Document).create({
                            uuid: report.uuid,
                            root: report.root,
                            policyUUID: instance.policyUUID,
                            policyTopicId: instance.policyTopicId,
                            instanceTopicId: instance.instanceTopicId,
                            timeStamp: data.id,
                            account: data.payer,
                            type: DocumentType.VP,
                            issuer: data.issuer,
                            action: data.action
                        });
                        await new DataBaseHelper(Document).save(row);
                    }
                    if (data.type === MessageType.RoleDocument) {
                        const row = new DataBaseHelper(Document).create({
                            uuid: report.uuid,
                            root: report.root,
                            policyUUID: instance.policyUUID,
                            policyTopicId: instance.policyTopicId,
                            instanceTopicId: instance.instanceTopicId,
                            timeStamp: data.id,
                            account: data.payer,
                            type: DocumentType.ROLE,
                            issuer: data.issuer,
                            role: data.role,
                            group: data.group,
                            action: data.action
                        });
                        await new DataBaseHelper(Document).save(row);
                    }
                    if (data.type === MessageType.DIDDocument) {
                        const row = new DataBaseHelper(Document).create({
                            uuid: report.uuid,
                            root: report.root,
                            policyUUID: instance.policyUUID,
                            policyTopicId: instance.policyTopicId,
                            instanceTopicId: instance.instanceTopicId,
                            timeStamp: data.id,
                            account: data.payer,
                            type: DocumentType.DID,
                            issuer: data.did,
                            action: data.action
                        });
                        await new DataBaseHelper(Document).save(row);
                    }
                    if (data.type === MessageType.Topic && data.childId) {
                        const row = new DataBaseHelper(Topic).create({
                            uuid: report.uuid,
                            root: report.root,
                            policyUUID: instance.policyUUID,
                            policyTopicId: instance.policyTopicId,
                            instanceTopicId: instance.instanceTopicId,
                            account: data.payer,
                            timeStamp: data.id,
                            topicId: data.childId,
                            name: data.name,
                            description: data.description,
                            owner: data.owner,
                            action: data.action
                        });
                        await new DataBaseHelper(Topic).save(row);
                    }
                }
            });
        } catch (error) {
            report.error = String(error);
            return report;
        }
    }

    public static async searchDocuments(report: Status, skip: boolean = false): Promise<Status> {
        await AnalyticsUtils.updateStatus(report, ReportSteep.DOCUMENTS, ReportStatus.PROGRESS);

        //Policy Instance
        console.log('--- Policy Instance ---')

        const row = await new DataBaseHelper(PolicyInstance).find({
            uuid: report.uuid
        });
        const instances = AnalyticsUtils.unique(row, 'instanceTopicId');

        AnalyticsUtils.updateProgress(report, instances.length);

        const task = async (instance: PolicyInstance): Promise<void> => {
            await AnalyticsDocumentService.searchByInstance(report, instance.instanceTopicId, instance, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks = new Tasks(instances, task);
        await tasks.run(AnalyticsDocumentService.CHUNKS_COUNT);

        //User Topics
        console.log('--- User Topics ---')

        const row2 = await new DataBaseHelper(Topic).find({
            uuid: report.uuid
        });
        const topics = AnalyticsUtils.unique(row2, 'topicId');

        AnalyticsUtils.updateProgress(report, topics.length);

        const task2 = async (topic: Topic): Promise<void> => {
            await AnalyticsDocumentService.searchByInstance(report, topic.topicId, topic, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks2 = new Tasks(topics, task2);
        await tasks2.run(AnalyticsDocumentService.CHUNKS_COUNT);

        return report;
    }
}