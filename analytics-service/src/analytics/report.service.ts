import { DatabaseServer, MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS, MessageAction, PinoLogger } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import JSZip from 'jszip';
import xl from 'excel4node';
import { AnalyticsStatus as Status } from '../entity/analytics-status.js';
import { AnalyticsUser as User } from '../entity/analytics-user.js';
import { AnalyticsPolicy as Policy } from '../entity/analytics-policy.js';
import { AnalyticsPolicyInstance as PolicyInstance } from '../entity/analytics-policy-instance.js';
import { AnalyticsTopicCache as TopicCache } from '../entity/analytics-topic-cache.js';
import { AnalyticsDocument as Document } from '../entity/analytics-document.js';
import { AnalyticsModule as Module } from '../entity/analytics-module.js';
import { AnalyticsToken as Token } from '../entity/analytics-token.js';
import { AnalyticsTokenCache as TokenCache } from '../entity/analytics-token-cache.js';
import { AnalyticsTopic as Topic } from '../entity/analytics-topic.js';
import { AnalyticsSchema as Schema } from '../entity/analytics-schema.js';
import { AnalyticsSchemaPackage as SchemaPackage } from '../entity/analytics-schema-package.js';
import { AnalyticsTag as Tag } from '../entity/analytics-tag.js';
import { AnalyticsDashboard as Dashboard } from '../entity/analytics-dashboard.js';
import { ReportSteep } from '../interfaces/report-steep.type.js';
import { ReportStatus } from '../interfaces/report-status.type.js';
import { UserType } from '../interfaces/user.type.js';
import { ReportType } from '../interfaces/report.type.js';
import { DocumentType } from '../interfaces/document.type.js';
import { AnalyticsUtils } from '../helpers/utils.js';
import { Table } from '../helpers/table.js';
import { AnalyticsTokenService } from './token.service.js';
import { AnalyticsDocumentService } from './document.service.js';
import { AnalyticsUserService } from './user.service.js';
import { AnalyticsPolicyService } from './policy.service.js';
import moment from 'moment';
import { FilterObject } from '@mikro-orm/core';

/**
 * Report service
 */
export class ReportService {
    /**
     * Get root topic id
     */
    public static getRootTopic(): string {
        return process.env.INITIALIZATION_TOPIC_ID;
    }

    /**
     * Get root topic id
     */
    public static getRestartDate(): Date {
        let restartDate: Date = new Date(0);
        if (process.env.RESTART_DATE) {
            const _moment = moment(process.env.RESTART_DATE, 'yyyy-MM-dd');
            if (_moment.isValid()) {
                restartDate = _moment.toDate();
            }
        }
        return restartDate;
    }

    /**
     * Create report if need
     * @param root
     * @param restartDate
     */
    public static async init(root: string, restartDate: Date): Promise<void> {
        const databaseServer = new DatabaseServer();

        const report = await databaseServer.findOne(Status, {
            root,
            createDate: { $gt: restartDate }
        });

        if (!report) {
            const row = databaseServer.create(Status, {
                uuid: GenerateUUIDv4(),
                root,
                status: ReportStatus.NONE,
                type: ReportType.ALL,
                steep: '',
            } as unknown as Partial<Status>);

            await databaseServer.save(Status, row);
        }
    }

    /**
     * Reset report status
     * @param root
     * @param restartDate
     */
    public static async restart(root: string, restartDate: Date): Promise<Status> {
        const report = await new DatabaseServer().findOne(Status, {
            root,
            createDate: { $gt: restartDate }
        });

        if (report && report.status !== ReportStatus.FINISHED) {
            await AnalyticsUtils.updateStatus(report, null, ReportStatus.NONE);
            return await ReportService.run(root, restartDate);
        }
        return null;
    }

    /**
     * Update report
     * @param root
     * @param restartDate
     */
    public static async run(root: string, restartDate: Date): Promise<Status> {
        const report = await new DatabaseServer().findOne(Status, {
            root,
            createDate: { $gt: restartDate }
        });

        if (!report) {
            new PinoLogger().error(`Report does not exist`, ['ANALYTICS_SERVICE'], null);
            return report;
        }

        if (report.status === ReportStatus.PROGRESS) {
            new PinoLogger().error(`Report already started`, ['ANALYTICS_SERVICE'], null);
            return report;
        }

        await AnalyticsUtils.updateStatus(report, null, ReportStatus.PROGRESS);

        ReportService.update(report).then((result) => {
            if (result && result.status === ReportStatus.FINISHED) {
                new PinoLogger().info(`Update completed`, ['ANALYTICS_SERVICE'], null);
            }
        }, (error) => {
            new PinoLogger().error(`Update error: ${error?.message}`, ['ANALYTICS_SERVICE'], null);
        });

        return report;
    }

    /**
     * Update report
     * @param root
     * @param skip
     */
    private static async update(report: Status, skip: boolean = false): Promise<Status> {
        report.type = ReportType.ALL;
        report.error = null;

        report = await AnalyticsUserService.search(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.STANDARD_REGISTRY, ReportStatus.ERROR);
            throw new Error('An error occurred while loading Standard Registries');
        }
        if (report.type === ReportType.USERS) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.STANDARD_REGISTRY, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsPolicyService.searchPolicy(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.POLICIES, ReportStatus.ERROR);
            throw new Error('An error occurred while loading Policies');
        }
        if (report.type === ReportType.POLICIES) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.POLICIES, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsPolicyService.searchInstance(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.INSTANCES, ReportStatus.ERROR);
            throw new Error('An error occurred while loading Policy Versions');
        }
        if (report.type === ReportType.INSTANCES) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.INSTANCES, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsTokenService.search(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.TOKENS, ReportStatus.ERROR);
            throw new Error('An error occurred while loading Tokens');
        }
        if (report.type === ReportType.TOKENS) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.TOKENS, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsDocumentService.searchDocuments(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.DOCUMENTS, ReportStatus.ERROR);
            throw new Error('An error occurred while loading Documents');
        }
        if (report.type === ReportType.DOCUMENTS) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.DOCUMENTS, ReportStatus.FINISHED);
            return report;
        }

        await AnalyticsUtils.updateStatus(report, ReportSteep.DOCUMENTS, ReportStatus.FINISHED);

        await ReportService.createDashboard(report);

        return report;
    }

    /**
     * Aggregate data
     * @param uuid
     */
    private static async loadData(uuid: string): Promise<any> {
        const databaseServer = new DatabaseServer();

        //Total
        const topics = await databaseServer.find(TopicCache, { uuid });
        const rowTokens = await databaseServer.find(Token, { uuid }) as any[];
        const balances = await databaseServer.find(TokenCache, { uuid });
        const policies = await databaseServer.find(Policy, { uuid }) as any[];
        const instances = await databaseServer.find(PolicyInstance, { uuid }) as any[];
        const modules = await databaseServer.find(Module, { uuid });
        const users = await databaseServer.find(User, { uuid });
        const tags = await databaseServer.find(Tag, { uuid, action: MessageAction.PublishTag });
        const userTopicCount = await databaseServer.count(Topic, { uuid });

        let schemaCount = await databaseServer.count(Schema, { uuid, action: MessageAction.PublishSchema });
        let systemSchemaCount = await databaseServer.count(Schema, { uuid, action: MessageAction.PublishSystemSchema });

        const schemaPackages = await databaseServer.find(SchemaPackage, { uuid, action: MessageAction.PublishSchemas });
        const systemSchemaPackages = await databaseServer.find(SchemaPackage, { uuid, action: MessageAction.PublishSystemSchemas });
        let schemaPackageCount = 0;
        let systemSchemaPackageCount = 0;
        for (const schemaPackage of schemaPackages) {
            schemaPackageCount += (schemaPackage.schemas || 0);
        }
        for (const systemSchemaPackage of systemSchemaPackages) {
            systemSchemaPackageCount += (systemSchemaPackage.schemas || 0);
        }

        schemaCount = schemaCount + schemaPackageCount;
        systemSchemaCount = systemSchemaCount + systemSchemaPackageCount;

        const docByPolicy =
            await databaseServer
                .aggregate(Document, databaseServer.getAnalyticsDocAggregationFilters(MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.DOC_BY_POLICY, uuid) as FilterObject<any>[])

        const docByInstance =
            await databaseServer
                .aggregate(Document, databaseServer.getAnalyticsDocAggregationFilters(MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.DOC_BY_INSTANCE, uuid) as FilterObject<any>[])

        const docsGroups =
            await databaseServer
                .aggregate(Document, databaseServer.getAnalyticsDocAggregationFilters(MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.DOCS_GROUPS, uuid) as FilterObject<any>[])

        const didCount = docsGroups
            .filter(g => g._id.type === DocumentType.DID && g._id.action !== MessageAction.RevokeDocument)
            .reduce((sum, g) => sum + g.count, 0);
        const vcCount = docsGroups
            .filter(g => g._id.type === DocumentType.VC && g._id.action !== MessageAction.RevokeDocument)
            .reduce((sum, g) => sum + g.count, 0);
        const vpCount = docsGroups
            .filter(g => g._id.type === DocumentType.VP && g._id.action !== MessageAction.RevokeDocument)
            .reduce((sum, g) => sum + g.count, 0);
        const allCount = docsGroups
            .filter(g => g._id.action !== MessageAction.RevokeDocument)
            .reduce((sum, g) => sum + g.count, 0);
        const revokeCount = docsGroups
            .filter(g => g._id.action === MessageAction.RevokeDocument)
            .reduce((sum, g) => sum + g.count, 0);

        const messages = topics.reduce((sum, topic) => sum + topic.index, 0);
        const srCount = users.reduce((sum, user) => sum + (user.type === UserType.STANDARD_REGISTRY ? 1 : 0), 0);
        const userCount = users.reduce((sum, user) => sum + (user.type === UserType.USER ? 1 : 0), 0);

        const tokens = AnalyticsUtils.unique(rowTokens, 'tokenId') as any[];
        const balancesMap = new Map<string, number>();
        for (const balance of balances) {
            balancesMap.set(balance.tokenId, balance.balance);
        }

        let ftCount = 0;
        let nftCount = 0;
        let ftBalance = 0;
        let nftBalance = 0;
        for (const token of tokens) {
            token.balance = balancesMap.get(token.tokenId) || 0;
            if (token.tokenType === 'non-fungible') {
                nftCount++;
                nftBalance += token.balance;
            } else {
                ftCount++;
                ftBalance += token.balance;
            }
        }
        for (const token of rowTokens) {
            token.balance = balancesMap.get(token.tokenId) || 0;
        }

        const docByPolicyMap = new Map<string, Map<string, number>>();
        for (const group of docByPolicy) {
            const policyTopicId = group._id.policyTopicId;
            const type = group._id.type;
            const action = group._id.action;
            let map: any;
            if (docByPolicyMap.has(policyTopicId)) {
                map = docByPolicyMap.get(policyTopicId);
            } else {
                map = { all: 0, vp: 0, vc: 0, did: 0, revoke: 0 };
                docByPolicyMap.set(policyTopicId, map);
            }
            if (action === MessageAction.RevokeDocument) {
                map.revoke += group.count;
            } else {
                map.all += group.count;
                if (type === DocumentType.VP) {
                    map.vp += group.count;
                } else if (type === DocumentType.VC) {
                    map.vc += group.count;
                } else if (type === DocumentType.DID) {
                    map.did += group.count;
                }
            }
        }
        const docByInstanceMap = new Map();
        for (const group of docByInstance) {
            const instanceTopicId = group._id.instanceTopicId;
            const type = group._id.type;
            const action = group._id.action;
            let map: any;
            if (docByInstanceMap.has(instanceTopicId)) {
                map = docByInstanceMap.get(instanceTopicId);
            } else {
                map = { all: 0, vp: 0, vc: 0, did: 0, revoke: 0 };
                docByInstanceMap.set(instanceTopicId, map);
            }
            if (action === MessageAction.RevokeDocument) {
                map.revoke += group.count;
            } else {
                map.all += group.count;
                if (type === DocumentType.VP) {
                    map.vp += group.count;
                } else if (type === DocumentType.VC) {
                    map.vc += group.count;
                } else if (type === DocumentType.DID) {
                    map.did += group.count;
                }
            }
        }

        const instanceMap = new Map();
        for (const i of instances) {
            i._documents = docByInstanceMap.get(i.instanceTopicId) ||
                { all: 0, vp: 0, vc: 0, did: 0, revoke: 0 };
            if (instanceMap.has(i.policyTopicId)) {
                instanceMap.set(i.policyTopicId, instanceMap.get(i.policyTopicId) + 1);
            } else {
                instanceMap.set(i.policyTopicId, 1);
            }
        }

        for (const p of policies) {
            const rowPolicyTokens = rowTokens.filter(t => t.policyTopicId === p.topicId)
            const policyTokens = AnalyticsUtils.unique(rowPolicyTokens, 'tokenId');
            p._tokens = policyTokens;
            p._documents = docByPolicyMap.get(p.topicId) ||
                { all: 0, vp: 0, vc: 0, did: 0, revoke: 0 };
            p._versions = instanceMap.get(p.topicId) || 0;
        }

        return {
            topics,
            messages,
            policies,
            instances,
            modules,
            tokens,
            users,
            srCount,
            userCount,
            userTopicCount,
            allCount,
            vcCount,
            vpCount,
            didCount,
            revokeCount,
            tags,
            schemaCount,
            systemSchemaCount,
            ftCount,
            nftCount,
            ftBalance,
            nftBalance
        }
    }

    /**
     * Create snapshot
     * @param report
     * @param size
     */
    private static async createSnapshot(report: Status, size: number = 10): Promise<any> {
        const {
            topics,
            messages,
            policies,
            instances,
            modules,
            tokens,
            users,
            srCount,
            userCount,
            userTopicCount,
            allCount,
            vcCount,
            vpCount,
            didCount,
            revokeCount,
            tags,
            schemaCount,
            systemSchemaCount,
            ftCount,
            nftCount,
            ftBalance,
            nftBalance
        } = await ReportService.loadData(report.uuid);
        const _users = users.filter(u => u.type === UserType.USER);
        const topSRByUsers = AnalyticsUtils.topRateByCount(_users, 'owner', size);
        const topSRByPolicies = AnalyticsUtils.topRateByCount(policies, 'owner', size);
        const topTagsByLabel = AnalyticsUtils.topRateByCount(tags, 'name', size);
        const topModulesByName = AnalyticsUtils.topRateByCount(modules, 'name', size);
        const topPoliciesByName = AnalyticsUtils.topRateByCount(policies, 'name', size);
        const topVersionsByName = AnalyticsUtils.topRateByCount(instances, 'name', size);
        const topPoliciesByDocuments = AnalyticsUtils.topRateByValue(instances.map((i: any) => {
            return {
                name: i.name,
                instanceTopicId: i.instanceTopicId,
                value: i._documents.all
            }
        }), size);
        const topPoliciesByDID = AnalyticsUtils.topRateByValue(instances.map((i: any) => {
            return {
                name: i.name,
                instanceTopicId: i.instanceTopicId,
                value: i._documents.did
            }
        }), size);
        const topPoliciesByVC = AnalyticsUtils.topRateByValue(instances.map((i: any) => {
            return {
                name: i.name,
                instanceTopicId: i.instanceTopicId,
                value: i._documents.vc
            }
        }), size);
        const topPoliciesByVP = AnalyticsUtils.topRateByValue(instances.map((i: any) => {
            return {
                name: i.name,
                instanceTopicId: i.instanceTopicId,
                value: i._documents.vp
            }
        }), size);
        const topPoliciesByRevoked = AnalyticsUtils.topRateByValue(instances.map((i: any) => {
            return {
                name: i.name,
                instanceTopicId: i.instanceTopicId,
                value: i._documents.revoke
            }
        }), size);
        const _fTokens = tokens.filter((d: any) => d.tokenType !== 'non-fungible');
        const _nfTokens = tokens.filter((d: any) => d.tokenType === 'non-fungible');
        const topTokensByName = AnalyticsUtils.topRateByCount(tokens, 'tokenName', size);
        const topFTokensByName = AnalyticsUtils.topRateByCount(_fTokens, 'tokenName', size);
        const topNFTokensByName = AnalyticsUtils.topRateByCount(_nfTokens, 'tokenName', size);
        const topFTokensByBalance = AnalyticsUtils.topRateByValue(_fTokens.map((item: any) => {
            return {
                name: item.tokenName,
                tokenId: item.tokenId,
                value: item.balance
            }
        }), size);
        const topNFTokensByBalance = AnalyticsUtils.topRateByValue(_nfTokens.map((item: any) => {
            return {
                name: item.tokenName,
                tokenId: item.tokenId,
                value: item.balance
            }
        }), size);

        const databaseServer = new DatabaseServer();

        const schemasByName = await databaseServer.aggregate(Document, databaseServer.getAnalyticsDocAggregationFilters(MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.SCHEMA_BY_NAME, report.uuid) as FilterObject<any>[])

        const topAllSchemasByName = [];
        const topSystemSchemasByName = [];
        const topSchemasByName = [];
        for (const row of schemasByName) {
            if (
                topSystemSchemasByName.length >= size &&
                topSchemasByName.length >= size
            ) {
                break;
            }
            if (topAllSchemasByName.length < size) {
                topAllSchemasByName.push({ name: row._id.name, value: row.count });
            }
            if (
                topSystemSchemasByName.length < size &&
                row._id.action === MessageAction.PublishSystemSchema
            ) {
                topSystemSchemasByName.push({ name: row._id.name, value: row.count });
            }
            if (
                topSchemasByName.length < size &&
                row._id.action === MessageAction.PublishSchema
            ) {
                topSchemasByName.push({ name: row._id.name, value: row.count });
            }
        }
        return {
            messages,
            topics: topics.length,
            standardRegistries: srCount,
            users: userCount,
            policies: policies.length,
            instances: instances.length,
            modules: modules.length,
            documents: allCount,
            vcDocuments: vcCount,
            vpDocuments: vpCount,
            didDocuments: didCount,
            userTopic: userTopicCount,
            tokens: tokens.length,
            fTokens: ftCount,
            nfTokens: nftCount,
            tags: tags.length,
            schemas: schemaCount,
            systemSchemas: systemSchemaCount,
            revokeDocuments: revokeCount,
            fTotalBalances: ftBalance,
            nfTotalBalances: nftBalance,
            topSize: size,
            topSRByUsers,
            topSRByPolicies,
            topTagsByLabel,
            topAllSchemasByName,
            topSystemSchemasByName,
            topSchemasByName,
            topModulesByName,
            topPoliciesByName,
            topVersionsByName,
            topPoliciesByDocuments,
            topPoliciesByDID,
            topPoliciesByVC,
            topPoliciesByVP,
            topPoliciesByRevoked,
            topTokensByName,
            topFTokensByName,
            topNFTokensByName,
            topFTokensByBalance,
            topNFTokensByBalance,
        };
    }

    /**
     * Create snapshot
     * @param report
     */
    public static async createDashboard(report: Status): Promise<any> {
        if (report.status !== ReportStatus.FINISHED) {
            throw new Error('Report not finished');
        }

        const data = await ReportService.createSnapshot(report, 10);

        const row = {
            uuid: report.uuid,
            root: report.root,
            date: Date.now(),
            report: data
        } as unknown as Partial<Dashboard>;

        const databaseServer = new DatabaseServer();

        const entity = await databaseServer.create(Dashboard, row);

        return await databaseServer.save(Dashboard, entity);
    }

    /**
     * Get snapshot by id
     * @param id
     */
    public static async getDashboard(id: string): Promise<Dashboard> {
        return await new DatabaseServer().findOne(Dashboard, id);
    }

    /**
     * Get all snapshots
     */
    public static async getDashboards(): Promise<Dashboard[]> {
        return new DatabaseServer().find(Dashboard, null, {
            sort: { date: 1 },
            limit: 10,
            fields: [
                'uuid',
                'root',
                'date'
            ]
        });
    }

    /**
     * Get all reports
     */
    public static async getReports(): Promise<Status[]> {
        return new DatabaseServer().find(Status, null);
    }

    /**
     * Get current report
     * @param root
     * @param restartDate
     */
    public static async getCurrentReport(
        root: string,
        restartDate: Date
    ): Promise<Status> {
        return new DatabaseServer().findOne(Status, {
            root,
            createDate: { $gt: restartDate }
        });
    }

    /**
     * Get report by uuid
     * @param uuid
     * @param size
     */
    public static async getReport(uuid: string, size: number = 10): Promise<any> {
        const item = await new DatabaseServer().findOne(Status, { uuid });

        if (!item) {
            throw new Error('Report does not exist');
        }
        if (item.status !== ReportStatus.FINISHED) {
            return {
                status: item.status
            };
        }
        const result = await ReportService.createSnapshot(item, size);
        return {
            uuid: item.uuid,
            root: item.root,
            status: item.status,
            report: result
        };
    }

    /**
     * Convert report to csv
     * @param uuid
     */
    public static async csv(uuid: string): Promise<any> {
        const item = await new DatabaseServer().findOne(Status, { uuid });

        if (!item) {
            throw new Error('Report does not exist');
        }

        if (item.status !== ReportStatus.FINISHED) {
            return {
                status: item.status
            };
        }

        const {
            topics,
            messages,
            policies,
            instances,
            modules,
            tokens,
            users,
            srCount,
            userCount,
            userTopicCount,
            allCount,
            vcCount,
            vpCount,
            didCount,
            revokeCount,
            tags,
            schemaCount,
            systemSchemaCount,
            ftCount,
            nftCount,
            ftBalance,
            nftBalance
        } = await ReportService.loadData(item.uuid);

        const totalCSV = new Table('total');
        totalCSV
            .addHeader('Total Topics', { width: 12, type: 'number' })
            .addHeader('Total Messages', { width: 16, type: 'number' })
            .addHeader('Standard Registries', { width: 18, type: 'number' })
            .addHeader('Users', { width: 10, type: 'number' })
            .addHeader('Policies', { width: 10, type: 'number' })
            .addHeader('Policy Versions', { width: 16, type: 'number' })
            .addHeader('Modules', { width: 10, type: 'number' })
            .addHeader('Total Documents', { width: 16, type: 'number' })
            .addHeader('DID Documents', { width: 16, type: 'number' })
            .addHeader('VC Documents', { width: 16, type: 'number' })
            .addHeader('VP Documents', { width: 16, type: 'number' })
            .addHeader('Revoked Documents', { width: 16, type: 'number' })
            .addHeader('User Topics', { width: 16, type: 'number' })
            .addHeader('Fungible Tokens', { width: 20, type: 'number' })
            .addHeader('Total Balances (FT)', { width: 20, type: 'number' })
            .addHeader('Non-Fungible Tokens', { width: 20, type: 'number' })
            .addHeader('Total Balances (NFT)', { width: 20, type: 'number' })
            .addHeader('Tags', { width: 20, type: 'number' })
            .addHeader('Schemas', { width: 20, type: 'number' })
            .addHeader('System Schemas', { width: 20, type: 'number' });
        totalCSV
            .add(topics.length)
            .add(messages)
            .add(srCount)
            .add(userCount)
            .add(policies.length)
            .add(instances.length)
            .add(modules.length)
            .add(allCount)
            .add(didCount)
            .add(vcCount)
            .add(vpCount)
            .add(revokeCount)
            .add(userTopicCount)
            .add(ftCount)
            .add(ftBalance)
            .add(nftCount)
            .add(nftBalance)
            .add(tags.length)
            .add(schemaCount)
            .add(systemSchemaCount)
            .addLine();

        //Users
        const usersCSV = new Table('users');
        usersCSV
            .addHeader('DID', { width: 80 })
            .addHeader('Topic', { width: 16 })
            .addHeader('Account', { width: 16 })
            .addHeader('Type', { width: 20 })
            .addHeader('Standard Registry', { width: 80 });
        for (const user of users) {
            usersCSV
                .add(user.did)
                .add(user.topicId)
                .add(user.account)
                .add(user.type)
                .add(user.type === UserType.USER ? user.owner : '-')
                .addLine()
        }

        //Policies
        const policiesCSV = new Table('policies');
        policiesCSV
            .addHeader('UUID', { width: 40 })
            .addHeader('Policy Topic', { width: 16 })
            .addHeader('Creator (Account)', { width: 18 })
            .addHeader('Creator', { width: 80 })
            .addHeader('Policy Name', { width: 30 })
            .addHeader('Policy Description', { width: 30 })
            .addHeader('Versions', { width: 30 })
            .addHeader('VP Documents', { width: 18, type: 'number' })
            .addHeader('VC Documents', { width: 18, type: 'number' })
            .addHeader('Revoked Documents', { width: 18, type: 'number' });
        let tokenCount = 0;
        for (const p of policies) {
            const tokenNames = p._tokens.map((t: any) => String(t.tokenId));
            const tokenBalances = p._tokens.map((t: any) => String(t.balance));
            policiesCSV
                .add(p.policyUUID)
                .add(p.topicId)
                .add(p.account)
                .add(p.owner)
                .add(p.name)
                .add(p.description)
                .add(String(p._versions))
                .add(String(p._documents.vp))
                .add(String(p._documents.vc))
                .add(String(p._documents.revoke))
            for (let index = 0; index < tokenNames.length; index++) {
                const name = tokenNames[index];
                const balance = tokenBalances[index] || 0;
                policiesCSV
                    .add(name)
                    .add(String(balance))
            }
            policiesCSV.addLine();
            tokenCount = Math.max(tokenCount, tokenNames.length);
        }
        for (let index = 1; index < (tokenCount + 1); index++) {
            policiesCSV
                .addHeader(`Token ${index}`, { width: 18 })
                .addHeader(`Balance ${index}`, { width: 18, type: 'number' });
        }

        //Tokens
        const tokensCSV = new Table('tokens');
        tokensCSV
            .addHeader('Creator (Account)', { width: 18 })
            .addHeader('Creator', { width: 80 })
            .addHeader('Token Id', { width: 16 })
            .addHeader('Token Name', { width: 30 })
            .addHeader('Token Symbol', { width: 16 })
            .addHeader('Token Type', { width: 16 })
            .addHeader('Balance', { width: 18, type: 'number' });
        for (const token of tokens) {
            tokensCSV
                .add(token.account)
                .add(token.owner)
                .add(token.tokenId)
                .add(token.tokenName)
                .add(token.tokenSymbol)
                .add(token.tokenType)
                .add(String(token.balance))
                .addLine()
        }

        //Instances
        const instancesCSV = new Table('instances');
        instancesCSV
            .addHeader('UUID', { width: 40 })
            .addHeader('Policy Topic', { width: 16 })
            .addHeader('Creator (Account)', { width: 18 })
            .addHeader('Creator', { width: 80 })
            .addHeader('Instance Topic', { width: 18 })
            .addHeader('Policy Name', { width: 30 })
            .addHeader('Policy Description', { width: 30 })
            .addHeader('Policy Version', { width: 18 })
            .addHeader('VP Documents', { width: 18, type: 'number' })
            .addHeader('VC Documents', { width: 18, type: 'number' })
            .addHeader('Revoked Documents', { width: 18, type: 'number' });
        for (const i of instances) {
            instancesCSV
                .add(i.policyUUID)
                .add(i.policyTopicId)
                .add(i.account)
                .add(i.owner)
                .add(i.instanceTopicId)
                .add(i.name)
                .add(i.description)
                .add(i.version)
                .add(String(i._documents.vp))
                .add(String(i._documents.vc))
                .add(String(i._documents.revoke))
                .addLine()
        }

        //Modules
        const modulesCSV = new Table('modules');
        modulesCSV
            .addHeader('Creator (Account)', { width: 18 })
            .addHeader('Creator', { width: 80 })
            .addHeader('Module Name', { width: 30 })
            .addHeader('Module Description', { width: 30 });
        for (const m of modules) {
            modulesCSV
                .add(m.account)
                .add(m.owner)
                .add(m.name)
                .add(m.description)
                .addLine()
        }

        //Tags
        const tagsCSV = new Table('tags');
        tagsCSV
            .addHeader('Creator (Account)', { width: 18 })
            .addHeader('Creator', { width: 80 })
            .addHeader('Label', { width: 30 })
            .addHeader('Description', { width: 30 })
            .addHeader('Target', { width: 30 });
        for (const t of tags) {
            tagsCSV
                .add(t.account)
                .add(t.owner)
                .add(t.name)
                .add(t.description)
                .add(t.target)
                .addLine()
        }

        return [
            totalCSV,
            usersCSV,
            policiesCSV,
            tokensCSV,
            instancesCSV,
            modulesCSV,
            tagsCSV
        ]
    }

    /**
     * Generate zip archive
     * @param {Table[]} data
     * @returns {@Promise<JSZip>>}
     */
    public static async generateCSV(data: Table[]): Promise<JSZip> {
        const zip = new JSZip();
        for (const table of data) {
            zip.file(`${table.name}.csv`, table.csv());
        }
        return zip;
    }

    /**
     * Generate Excel
     * @param {Table[]} data
     * @returns {@Promise<any>>}
     */
    public static async generateExcel(data: Table[]): Promise<any> {
        const wb = new xl.Workbook();
        const headerStyle = wb.createStyle({
            font: {
                bold: true,
                color: '#000000',
                size: 12,
            }
        });
        const valueStyle = wb.createStyle({
            font: {
                color: '#000000',
                size: 12,
            },
        });
        for (const table of data) {
            const sheets = wb.addWorksheet(table.name);
            if (table.headers.length) {
                for (const header of table.headers) {
                    sheets
                        .column(header.col)
                        .setWidth(header.width || 10);
                    sheets
                        .cell(header.row, header.col)
                        .string(header.value)
                        .style(headerStyle);
                }
                sheets.row(1).freeze();
            }
            let rowIndex = table.headers.length ? 1 : 0;
            let colIndex = 0;
            for (const line of table.buffer) {
                rowIndex++;
                colIndex = 0;
                for (const value of line) {
                    colIndex++;
                    sheets
                        .cell(rowIndex, colIndex)
                        .string(value)
                        .style(valueStyle);
                }
            }
        }
        return wb;
    }
}
