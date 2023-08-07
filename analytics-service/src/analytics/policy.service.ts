import {
    DIDMessage,
    DataBaseHelper,
    Message,
    MessageType,
    ModuleMessage,
    PolicyMessage,
    RegistrationMessage,
    RoleMessage,
    TokenMessage,
    TopicMessage,
    VCMessage,
    VPMessage
} from '@guardian/common';
import { AnalyticsUser as User } from '../entity/analytics-user';
import { AnalyticsStatus as Status } from '../entity/analytics-status';
import { AnalyticsPolicy as Policy } from '../entity/analytics-policy';
import { AnalyticsPolicyInstance as PolicyInstance } from '../entity/analytics-policy-instance';
import { AnalyticsDocument as Document } from '../entity/analytics-document';
import { AnalyticsModule as Module } from '../entity/analytics-module';
import { AnalyticsToken as Token } from '../entity/analytics-token';
import { AnalyticsTopic as Topic } from '../entity/analytics-topic';

import { ReportSteep } from '../interfaces/report-steep.type';
import { ReportStatus } from '../interfaces/report-status.type';
import { UserType } from '../interfaces/user.type';
import { AnalyticsUtils } from './utils';
import { DocumentType } from '../interfaces/document.type';
import { Tasks } from './tasks';

export class AnalyticsPolicy {
    private static parsPolicyMessage(message: any): PolicyMessage | DIDMessage | ModuleMessage {
        try {
            if (typeof message.message !== 'string' || !message.message.startsWith('{')) {
                return;
            }
            const json = JSON.parse(message.message);
            let item: PolicyMessage | DIDMessage | ModuleMessage;
            if (json.type === MessageType.DIDDocument) {
                item = DIDMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Policy) {
                item = PolicyMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Module) {
                item = ModuleMessage.fromMessageObject(json);
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

    private static parsInstanceMessage(message: any): PolicyMessage | TokenMessage {
        try {
            if (typeof message.message !== 'string' || !message.message.startsWith('{')) {
                return;
            }
            const json = JSON.parse(message.message);
            let item: PolicyMessage | TokenMessage;
            if (json.type === MessageType.InstancePolicy) {
                item = PolicyMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Token) {
                item = TokenMessage.fromMessageObject(json);
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

    public static async searchByUser(report: Status, sr: User, skip: boolean = false): Promise<Status> {
        try {
            return await AnalyticsUtils.searchMessages(report, sr.topicId, skip, async (message) => {
                const data: any = AnalyticsPolicy.parsPolicyMessage(message);
                if (data) {
                    if (data.type === MessageType.DIDDocument && data.did !== sr.did) {
                        const row = new DataBaseHelper(User).create({
                            uuid: report.uuid,
                            root: report.root,
                            topicId: data.topicId,
                            did: data.did,
                            account: data.payer,
                            timeStamp: data.id,
                            type: UserType.USER,
                            owner: sr.did
                        });
                        await new DataBaseHelper(User).save(row);
                    }
                    if (data.type === MessageType.Policy) {
                        const row = new DataBaseHelper(Policy).create({
                            uuid: report.uuid,
                            root: report.root,
                            account: data.payer,
                            topicId: data.policyTopicId,
                            policyUUID: data.uuid,
                            name: data.name,
                            description: data.description,
                            timeStamp: data.id,
                            owner: sr.did
                        });
                        await new DataBaseHelper(Policy).save(row);
                    }
                    if (data.type === MessageType.Module) {
                        const row = new DataBaseHelper(Module).create({
                            uuid: report.uuid,
                            root: report.root,
                            account: data.payer,
                            timeStamp: data.id,
                            name: data.name,
                            description: data.description,
                            owner: sr.did
                        });
                        await new DataBaseHelper(Module).save(row);
                    }
                }
            });
        } catch (error) {
            report.error = String(error);
            return report;
        }
    }

    public static async searchByPolicy(report: Status, policy: Policy, skip: boolean = false): Promise<Status> {
        try {
            return await AnalyticsUtils.searchMessages(report, policy.topicId, skip, async (message) => {
                const data: any = AnalyticsPolicy.parsInstanceMessage(message);
                if (data) {
                    if (data.type === MessageType.InstancePolicy) {
                        const row = new DataBaseHelper(PolicyInstance).create({
                            uuid: report.uuid,
                            root: report.root,
                            account: data.payer,
                            policyTopicId: policy.topicId,
                            instanceTopicId: data.instanceTopicId,
                            policyUUID: data.uuid,
                            name: data.name,
                            description: data.description,
                            version: data.version,
                            timeStamp: data.id,
                            owner: policy.owner
                        });
                        await new DataBaseHelper(PolicyInstance).save(row);
                    }
                    if (data.type === MessageType.Token) {
                        const row = new DataBaseHelper(Token).create({
                            uuid: report.uuid,
                            root: report.root,
                            account: data.payer,
                            timeStamp: data.id,
                            policyTopicId: policy.topicId,
                            tokenId: data.tokenId,
                            tokenName: data.tokenName,
                            tokenSymbol: data.tokenSymbol,
                            tokenType: data.tokenType,
                            owner: policy.owner
                        });
                        await new DataBaseHelper(Token).save(row);
                    }
                }
            });
        } catch (error) {
            report.error = String(error);
            return report;
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
                const data: any = AnalyticsPolicy.parsDocumentMessage(message);
                if (data) {
                    if (data.type === MessageType.VCDocument || data.type === MessageType.EVCDocument) {
                        const row = new DataBaseHelper(Document).create({
                            uuid: report.uuid,
                            root: report.root,
                            policyUUID: instance.policyUUID,
                            instanceTopicId: instance.instanceTopicId,
                            timeStamp: data.id,
                            account: data.payer,
                            type: DocumentType.VC,
                            issuer: data.issuer,
                        });
                        await new DataBaseHelper(Document).save(row);
                    }
                    if (data.type === MessageType.VPDocument) {
                        const row = new DataBaseHelper(Document).create({
                            uuid: report.uuid,
                            root: report.root,
                            policyUUID: instance.policyUUID,
                            instanceTopicId: instance.instanceTopicId,
                            timeStamp: data.id,
                            account: data.payer,
                            type: DocumentType.VP,
                            issuer: data.issuer,
                        });
                        await new DataBaseHelper(Document).save(row);
                    }
                    if (data.type === MessageType.RoleDocument) {
                        const row = new DataBaseHelper(Document).create({
                            uuid: report.uuid,
                            root: report.root,
                            policyUUID: instance.policyUUID,
                            instanceTopicId: instance.instanceTopicId,
                            timeStamp: data.id,
                            account: data.payer,
                            type: DocumentType.ROLE,
                            issuer: data.issuer,
                            role: data.role,
                            group: data.group,
                        });
                        await new DataBaseHelper(Document).save(row);
                    }
                    if (data.type === MessageType.DIDDocument) {
                        const row = new DataBaseHelper(Document).create({
                            uuid: report.uuid,
                            root: report.root,
                            policyUUID: instance.policyUUID,
                            instanceTopicId: instance.instanceTopicId,
                            timeStamp: data.id,
                            account: data.payer,
                            type: DocumentType.DID,
                            issuer: data.did,
                        });
                        await new DataBaseHelper(Document).save(row);
                    }
                    if (data.type === MessageType.Topic && data.childId) {
                        const row = new DataBaseHelper(Topic).create({
                            uuid: report.uuid,
                            root: report.root,
                            policyUUID: instance.policyUUID,
                            instanceTopicId: instance.instanceTopicId,
                            account: data.payer,
                            timeStamp: data.id,
                            topicId: data.childId,
                            name: data.name,
                            description: data.description,
                            owner: data.owner
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

    public static async search(report: Status, skip: boolean = false): Promise<Status> {
        await AnalyticsUtils.updateStatus(report, ReportSteep.POLICIES, ReportStatus.PROGRESS);

        const row = await new DataBaseHelper(User).find({
            uuid: report.uuid,
            type: UserType.STANDARD_REGISTRY
        });
        const users = AnalyticsUtils.unique(row, 'topicId')
        AnalyticsUtils.updateProgress(report, users.length);

        const task = async (user: User): Promise<void> => {
            await AnalyticsPolicy.searchByUser(report, user, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks = new Tasks(users, task);
        await tasks.run(10);

        return report;
    }

    public static async searchInstance(report: Status, skip: boolean = false): Promise<Status> {
        await AnalyticsUtils.updateStatus(report, ReportSteep.INSTANCES, ReportStatus.PROGRESS);

        const row = await new DataBaseHelper(Policy).find({
            uuid: report.uuid
        });
        const policies = AnalyticsUtils.unique(row, 'topicId')

        AnalyticsUtils.updateProgress(report, policies.length);

        const task = async (policy: Policy): Promise<void> => {
            await AnalyticsPolicy.searchByPolicy(report, policy, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks = new Tasks(policies, task);
        await tasks.run(10);

        return report;
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
            await AnalyticsPolicy.searchByInstance(report, instance.instanceTopicId, instance, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks = new Tasks(instances, task);
        await tasks.run(10);

        const c1 = await new DataBaseHelper(Document).count({ uuid: report.uuid });

        //User Topics
        console.log('--- User Topics ---')

        const row2 = await new DataBaseHelper(Topic).find({
            uuid: report.uuid
        });
        const topics = AnalyticsUtils.unique(row2, 'topicId');

        AnalyticsUtils.updateProgress(report, topics.length);

        const task2 = async (topic: Topic): Promise<void> => {
            await AnalyticsPolicy.searchByInstance(report, topic.topicId, topic, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks2 = new Tasks(topics, task2);
        await tasks2.run(10);

        //Test
        const c2 = await new DataBaseHelper(Document).count({ uuid: report.uuid });

        return report;
    }
}