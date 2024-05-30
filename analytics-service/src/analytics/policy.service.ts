import {
    DIDMessage,
    DataBaseHelper,
    Message,
    MessageType,
    ModuleMessage,
    PolicyMessage,
    SchemaMessage,
    TagMessage,
    TokenMessage,
    UrlType,
} from '@guardian/common';
import { AnalyticsModule as Module } from '../entity/analytics-module.js';
import { AnalyticsPolicy as Policy } from '../entity/analytics-policy.js';
import { AnalyticsPolicyInstance as PolicyInstance } from '../entity/analytics-policy-instance.js';
import { AnalyticsSchema as Schema } from '../entity/analytics-schema.js';
import { AnalyticsStatus as Status } from '../entity/analytics-status.js';
import { AnalyticsTag as Tag } from '../entity/analytics-tag.js';
import { AnalyticsToken as Token } from '../entity/analytics-token.js';
import { AnalyticsUser as User } from '../entity/analytics-user.js';
import { ReportStatus } from '../interfaces/report-status.type.js';
import { ReportSteep } from '../interfaces/report-steep.type.js';
import { UserType } from '../interfaces/user.type.js';
import { Tasks } from '../helpers/tasks.js';
import { AnalyticsUtils } from '../helpers/utils.js';

/**
 * Search policy\version\schemas\tokens in user topics
 */
export class AnalyticsPolicyService {
    /**
     * Number of processes
     */
    private static readonly CHUNKS_COUNT = 10;

    /**
     * Pars documents
     * @param message
     */
    private static parsPolicyMessage(message: any): Message {
        try {
            if (typeof message.message !== 'string' || !message.message.startsWith('{')) {
                return;
            }
            const json = JSON.parse(message.message);
            let item: Message;
            if (json.type === MessageType.DIDDocument) {
                item = DIDMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Policy) {
                item = PolicyMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Module) {
                item = ModuleMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Tag) {
                item = TagMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Schema) {
                item = SchemaMessage.fromMessageObject(json);
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
            return null;
        }
    }

    /**
     * Pars documents
     * @param message
     */
    private static parsInstanceMessage(message: any): Message {
        try {
            if (typeof message.message !== 'string' || !message.message.startsWith('{')) {
                return;
            }
            const json = JSON.parse(message.message);
            let item: Message;
            if (json.type === MessageType.InstancePolicy) {
                item = PolicyMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Token) {
                item = TokenMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Tag) {
                item = TagMessage.fromMessageObject(json);
            }
            if (json.type === MessageType.Schema) {
                item = SchemaMessage.fromMessageObject(json);
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
            return null;
        }
    }

    /**
     * Search policies in user topic
     * @param report
     * @param sr
     * @param skip
     */
    public static async searchByUser(report: Status, sr: User, skip: boolean = false): Promise<Status> {
        try {
            return await AnalyticsUtils.searchMessages(report, sr.topicId, skip, async (message) => {
                const data: any = AnalyticsPolicyService.parsPolicyMessage(message);
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
                            owner: sr.did,
                            action: data.action
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
                            owner: sr.did,
                            action: data.action
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
                            owner: sr.did,
                            action: data.action
                        });
                        await new DataBaseHelper(Module).save(row);
                    }
                    if (data.type === MessageType.Tag) {
                        const row = new DataBaseHelper(Tag).create({
                            uuid: report.uuid,
                            root: report.root,
                            account: data.payer,
                            timeStamp: data.id,
                            tagUUID: data.uuid,
                            name: data.name,
                            description: data.description,
                            owner: data.owner,
                            target: data.target,
                            operation: data.operation,
                            entity: data.entity,
                            date: data.date,
                            action: data.action
                        });
                        await new DataBaseHelper(Tag).save(row);
                    }
                    if (data.type === MessageType.Schema) {
                        const row = new DataBaseHelper(Schema).create({
                            uuid: report.uuid,
                            root: report.root,
                            account: data.payer,
                            timeStamp: data.id,
                            name: data.name,
                            description: data.description,
                            entity: data.entity,
                            version: data.version,
                            owner: sr.did,
                            action: data.action,
                            ipfs: data.getDocumentUrl(UrlType.cid)
                        });
                        await new DataBaseHelper(Schema).save(row);
                    }
                }
            });
        } catch (error) {
            report.error = String(error);
            return report;
        }
    }

    /**
     * Search version\schemas\tokens in policy
     * @param report
     * @param policy
     * @param skip
     */
    public static async searchByPolicy(report: Status, policy: Policy, skip: boolean = false): Promise<Status> {
        try {
            return await AnalyticsUtils.searchMessages(report, policy.topicId, skip, async (message) => {
                const data: any = AnalyticsPolicyService.parsInstanceMessage(message);
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
                            owner: policy.owner,
                            action: data.action,
                            ipfs: data.getUrlValue(0, UrlType.cid)
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
                            owner: policy.owner,
                            action: data.action
                        });
                        await new DataBaseHelper(Token).save(row);
                    }
                    if (data.type === MessageType.Tag) {
                        const row = new DataBaseHelper(Tag).create({
                            uuid: report.uuid,
                            root: report.root,
                            account: data.payer,
                            timeStamp: data.id,
                            tagUUID: data.uuid,
                            name: data.name,
                            description: data.description,
                            owner: data.owner,
                            target: data.target,
                            operation: data.operation,
                            entity: data.entity,
                            date: data.date,
                            action: data.action
                        });
                        await new DataBaseHelper(Tag).save(row);
                    }
                    if (data.type === MessageType.Schema) {
                        const row = new DataBaseHelper(Schema).create({
                            uuid: report.uuid,
                            root: report.root,
                            account: data.payer,
                            timeStamp: data.id,
                            policyTopicId: policy.topicId,
                            name: data.name,
                            description: data.description,
                            entity: data.entity,
                            version: data.version,
                            owner: policy.owner,
                            action: data.action,
                            ipfs: data.getDocumentUrl(UrlType.cid)
                        });
                        await new DataBaseHelper(Schema).save(row);
                    }
                }
            });
        } catch (error) {
            report.error = String(error);
            return report;
        }
    }

    /**
     * Search policies in user topics
     * @param report
     * @param skip
     */
    public static async searchPolicy(report: Status, skip: boolean = false): Promise<Status> {
        await AnalyticsUtils.updateStatus(report, ReportSteep.POLICIES, ReportStatus.PROGRESS);

        const row = await new DataBaseHelper(User).find({
            uuid: report.uuid,
            type: UserType.STANDARD_REGISTRY
        });
        const users = AnalyticsUtils.unique(row, 'topicId')
        AnalyticsUtils.updateProgress(report, users.length);

        const task = async (user: User): Promise<void> => {
            await AnalyticsPolicyService.searchByUser(report, user, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks = new Tasks(users, task);
        await tasks.run(AnalyticsPolicyService.CHUNKS_COUNT);

        return report;
    }

    /**
     * Search version\schemas\tokens in policies
     * @param report
     * @param skip
     */
    public static async searchInstance(report: Status, skip: boolean = false): Promise<Status> {
        await AnalyticsUtils.updateStatus(report, ReportSteep.INSTANCES, ReportStatus.PROGRESS);

        const row = await new DataBaseHelper(Policy).find({
            uuid: report.uuid
        });
        const policies = AnalyticsUtils.unique(row, 'topicId')

        AnalyticsUtils.updateProgress(report, policies.length);

        const task = async (policy: Policy): Promise<void> => {
            await AnalyticsPolicyService.searchByPolicy(report, policy, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks = new Tasks(policies, task);
        await tasks.run(AnalyticsPolicyService.CHUNKS_COUNT);

        return report;
    }
}
