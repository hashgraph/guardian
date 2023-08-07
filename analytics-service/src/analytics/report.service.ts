import { AnalyticsStatus as Status } from '../entity/analytics-status';
import { AnalyticsUser as User } from '../entity/analytics-user';
import { AnalyticsPolicy as Policy } from '../entity/analytics-policy';
import { AnalyticsPolicyInstance as PolicyInstance } from '../entity/analytics-policy-instance';
import { AnalyticsTopicCache as TopicCache } from '../entity/analytics-topic-cache';
import { AnalyticsDocument as Document } from '../entity/analytics-document';
import { AnalyticsModule as Module } from '../entity/analytics-module';
import { AnalyticsToken as Token } from '../entity/analytics-token';
import { AnalyticsTokenCache as TokenCache } from '../entity/analytics-token-cache';
import { AnalyticsTopic as Topic } from '../entity/analytics-topic';

import { ReportSteep } from '../interfaces/report-steep.type';
import { ReportStatus } from '../interfaces/report-status.type';
import { AnalyticsUtils } from './utils';
import { AnalyticsStandardRegistry } from './standard-registry.service';
import { AnalyticsPolicy } from './policy.service';
import { UserType } from '../interfaces/user.type';
import { DataBaseHelper } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { ReportType } from '../interfaces/report.type';
import { DocumentType } from '../interfaces/document.type';
import { AnalyticsToken } from './token.service';

export class ReportService {
    public static async reset(): Promise<void> {
        const reports = await new DataBaseHelper(Status).find();
        for (const report of reports) {
            if (
                report.status !== ReportStatus.FINISHED &&
                report.status !== ReportStatus.ERROR
            ) {
                report.error = 'Restart services';
                report.status = ReportStatus.ERROR;
            }
            await new DataBaseHelper(Status).update(report);
        }
    }

    public static async getStatus(root: string): Promise<Status> {
        const report = await new DataBaseHelper(Status).findOne({ root });
        if (report) {
            return report;
        } else {
            const row = new DataBaseHelper(Status).create({
                uuid: GenerateUUIDv4(),
                root,
                status: '',
                steep: '',
            });
            return await new DataBaseHelper(Status).save(row);
        }
    }

    public static async get(root: string): Promise<Status> {
        return await new DataBaseHelper(Status).findOne({ root });
    }

    public static async create(root: string, type: ReportType): Promise<Status> {
        console.log('ReportService.create')
        const row = new DataBaseHelper(Status).create({
            uuid: GenerateUUIDv4(),
            root,
            status: '',
            steep: '',
            type
        });
        return await new DataBaseHelper(Status).save(row);
    }

    public static async update(
        uuid: string,
        type: ReportType = ReportType.ALL,
        skip: boolean = true
    ): Promise<Status> {
        console.log('ReportService.update')
        let report = await new DataBaseHelper(Status).findOne({ uuid });

        if (!report) {
            throw new Error('Report does not exist');
        }

        if (report.status === ReportStatus.PROGRESS) {
            throw new Error('Report already started');
        }

        report.type = type;
        report.error = null;

        report = await AnalyticsStandardRegistry.search(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.STANDARD_REGISTRY, ReportStatus.ERROR);
            throw new Error('Error');
        }
        if (report.type === ReportType.USERS) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.STANDARD_REGISTRY, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsPolicy.search(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.POLICIES, ReportStatus.ERROR);
            throw new Error('Error');
        }
        if (report.type === ReportType.POLICIES) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.POLICIES, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsPolicy.searchInstance(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.INSTANCES, ReportStatus.ERROR);
            throw new Error('Error');
        }
        if (report.type === ReportType.INSTANCES) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.INSTANCES, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsToken.search(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.TOKENS, ReportStatus.ERROR);
            throw new Error('Error');
        }
        if (report.type === ReportType.TOKENS) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.TOKENS, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsPolicy.searchDocuments(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.DOCUMENTS, ReportStatus.ERROR);
            throw new Error('Error');
        }
        if (report.type === ReportType.DOCUMENTS) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.DOCUMENTS, ReportStatus.FINISHED);
            return report;
        }

        await AnalyticsUtils.updateStatus(report, ReportSteep.DOCUMENTS, ReportStatus.FINISHED);

        return report;
    }

    public static async report(uuid: string): Promise<any> {
        console.log('ReportService.report')
        const item = await new DataBaseHelper(Status).findOne({ uuid });

        if (!item) {
            throw new Error('Report does not exist');
        }

        if (item.status !== ReportStatus.FINISHED) {
            return {
                status: item.status
            };
        }

        const standardRegistries = await new DataBaseHelper(User).find({
            uuid: item.uuid,
            type: UserType.STANDARD_REGISTRY
        });
        const users = await new DataBaseHelper(User).find({
            uuid: item.uuid,
            type: UserType.USER
        });
        const policies = await new DataBaseHelper(Policy).find({
            uuid: item.uuid
        });
        const instances = await new DataBaseHelper(PolicyInstance).find({
            uuid: item.uuid
        });
        const topics = await new DataBaseHelper(TopicCache).find({
            uuid: item.uuid
        });
        const modules = await new DataBaseHelper(Module).find({
            uuid: item.uuid
        });
        const documents = await new DataBaseHelper(Document).find({
            uuid: item.uuid
        });
        const userTopic = await new DataBaseHelper(Topic).find({
            uuid: item.uuid
        });
        const rowTokens = await new DataBaseHelper(Token).find({
            uuid: item.uuid
        });
        const balances = await new DataBaseHelper(TokenCache).find({ uuid });
        const tokens = AnalyticsUtils.unique(rowTokens, 'tokenId') as any[];

        let fTotalBalances = 0;
        let nfTotalBalances = 0;
        let balancesMap = new Map<string, number>();
        for (const balance of balances) {
            balancesMap.set(balance.tokenId, balance.balance);
        }
        for (const token of tokens) {
            token.balance = balancesMap.get(token.tokenId)
            if (token.tokenType === 'non-fungible') {
                nfTotalBalances += token.balance;
            } else {
                fTotalBalances += token.balance;
            }
        }
        const fTokens = tokens.filter(d => d.tokenType !== 'non-fungible');
        const nfTokens = tokens.filter(d => d.tokenType === 'non-fungible');

        const vcDocuments = documents.filter(d => d.type === DocumentType.VC);
        const vpDocuments = documents.filter(d => d.type === DocumentType.VP);

        const size = 1000;
        const topPolicies = AnalyticsUtils.topRate(policies, 'name', size);
        const topVersion = AnalyticsUtils.topRate(instances, 'name', size);
        const topSrByUser = AnalyticsUtils.topRate(users, 'owner', size);
        const topSrByPolicies = AnalyticsUtils.topRate(policies, 'owner', size);
        const topPoliciesByDocuments = AnalyticsUtils.topRate(documents, 'instanceTopicId', size);
        const topPoliciesByVP = AnalyticsUtils.topRate(vpDocuments, 'instanceTopicId', size);
        const topTokens = AnalyticsUtils.topRate(tokens, 'tokenName', size);
        const topFTokensByBalances = fTokens
            .sort((a, b) => a.balance > b.balance ? -1 : 1).
            slice(0, size).map(t => { return { name: t.tokenName, count: t.balance } });
        const topNFTokensByBalances = nfTokens
            .sort((a, b) => a.balance > b.balance ? -1 : 1).
            slice(0, size).map(t => { return { name: t.tokenName, count: t.balance } });

        for (const doc of topPoliciesByDocuments) {
            const p = instances.find(p => p.instanceTopicId === doc.name);
            doc.name += ` (${p.name})`;
        }
        for (const doc of topPoliciesByVP) {
            const p = instances.find(p => p.instanceTopicId === doc.name);
            doc.name += ` (${p.name})`;
        }

        let messages = 0;
        for (const topic of topics) {
            messages += topic.index;
        }

        const report: any = {
            status: item.status,
            standardRegistries: standardRegistries.length,
            users: users.length,
            policies: policies.length,
            instances: instances.length,
            topics: topics.length,
            modules: modules.length,
            documents: documents.length,
            vcDocuments: vcDocuments.length,
            vpDocuments: vpDocuments.length,
            userTopic: userTopic.length,
            tokens: tokens.length,
            fTokens: fTokens.length,
            nfTokens: nfTokens.length,
            fTotalBalances,
            nfTotalBalances,
            messages,
            topPolicies,
            topVersion,
            topSrByUser,
            topSrByPolicies,
            topPoliciesByDocuments,
            topPoliciesByVP,
            topTokens,
            topFTokensByBalances,
            topNFTokensByBalances
        };
        return report;
    }
}
