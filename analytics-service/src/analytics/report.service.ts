import { DataBaseHelper, MessageAction } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import JSZip from 'jszip';
import xl from 'excel4node';

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
import { AnalyticsSchema as Schema } from '../entity/analytics-schema';
import { AnalyticsTag as Tag } from '../entity/analytics-tag';

import { ReportSteep } from '../interfaces/report-steep.type';
import { ReportStatus } from '../interfaces/report-status.type';
import { UserType } from '../interfaces/user.type';
import { ReportType } from '../interfaces/report.type';
import { DocumentType } from '../interfaces/document.type';

import { AnalyticsTokenService } from './token.service';
import { AnalyticsDocumentService } from './document.service';
import { AnalyticsUserService } from './user.service';
import { AnalyticsPolicyService } from './policy.service';

import { AnalyticsUtils } from '../utils/utils';
import { Table } from '../utils/table';

export class ReportServiceService {
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

        report = await AnalyticsUserService.search(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.STANDARD_REGISTRY, ReportStatus.ERROR);
            throw new Error('Error');
        }
        if (report.type === ReportType.USERS) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.STANDARD_REGISTRY, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsPolicyService.searchPolicy(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.POLICIES, ReportStatus.ERROR);
            throw new Error('Error');
        }
        if (report.type === ReportType.POLICIES) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.POLICIES, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsPolicyService.searchInstance(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.INSTANCES, ReportStatus.ERROR);
            throw new Error('Error');
        }
        if (report.type === ReportType.INSTANCES) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.INSTANCES, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsTokenService.search(report, skip);
        if (report.error) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.TOKENS, ReportStatus.ERROR);
            throw new Error('Error');
        }
        if (report.type === ReportType.TOKENS) {
            await AnalyticsUtils.updateStatus(report, ReportSteep.TOKENS, ReportStatus.FINISHED);
            return report;
        }

        report = await AnalyticsDocumentService.searchDocuments(report, skip);
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

    private static async loadData(uuid: string): Promise<any> {
        //Total
        console.time('csv: loading');
        console.log('csv: find topics');
        const topics = await new DataBaseHelper(TopicCache).find({ uuid });
        console.log('csv: find tokens');
        const rowTokens = await new DataBaseHelper(Token).find({ uuid }) as any[];
        console.log('csv: find balances');
        const balances = await new DataBaseHelper(TokenCache).find({ uuid });
        console.log('csv: find policies');
        const policies = await new DataBaseHelper(Policy).find({ uuid }) as any[];
        console.log('csv: find instances');
        const instances = await new DataBaseHelper(PolicyInstance).find({ uuid }) as any[];
        console.log('csv: find modules');
        const modules = await new DataBaseHelper(Module).find({ uuid });
        console.log('csv: find users');
        const users = await new DataBaseHelper(User).find({ uuid });
        console.log('csv: count userTopic');
        const userTopicCount = await new DataBaseHelper(Topic).count({ uuid });
        console.log('csv: count Tag');
        const tagCount = await new DataBaseHelper(Tag).count({ uuid });
        console.log('csv: count Schema');
        const schemaCount = await new DataBaseHelper(Schema).count({ uuid, action: MessageAction.PublishSchema });
        console.log('csv: count System Schema');
        const systemSchemaCount = await new DataBaseHelper(Schema).count({ uuid, action: MessageAction.PublishSystemSchema });
        console.log('csv: aggregate documents by policy');
        const docByPolicy = await new DataBaseHelper(Document).aggregate([
            { $match: { uuid, } },
            {
                $group: {
                    _id: {
                        policyTopicId: "$policyTopicId",
                        type: "$type",
                        action: "$action"
                    }, count: { $sum: 1 }
                }
            }
        ]);
        console.log('csv: aggregate documents by instance');
        const docByInstance = await new DataBaseHelper(Document).aggregate([
            { $match: { uuid } },
            {
                $group: {
                    _id: {
                        instanceTopicId: "$instanceTopicId",
                        type: "$type",
                        action: "$action"
                    }, count: { $sum: 1 }
                }
            }
        ]);
        console.log('csv: aggregate documents by type');
        const docsGroups = await new DataBaseHelper(Document).aggregate([
            { $match: { uuid } },
            { $group: { _id: { type: "$type", action: "$action" }, count: { $sum: 1 } } }
        ]);
        console.timeEnd('csv: loading');

        console.time('csv: mapping');
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

        console.timeEnd('csv: mapping');

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
            tagCount,
            schemaCount,
            systemSchemaCount,
            ftCount,
            nftCount,
            ftBalance,
            nftBalance
        }
    }

    public static async report(uuid: string): Promise<any> {
        console.log('ReportService.report')
        console.time('ReportService.report')
        const item = await new DataBaseHelper(Status).findOne({ uuid });

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
            tagCount,
            schemaCount,
            systemSchemaCount,
            ftCount,
            nftCount,
            ftBalance,
            nftBalance
        } = await ReportServiceService.loadData(item.uuid);

        const size = 25;
        const _users = users.filter(u => u.type === UserType.USER);
        const topFTokensByBalances = tokens
            .filter((d: any) => d.tokenType !== 'non-fungible')
            .map((t: any) => {
                return {
                    name: t.tokenName,
                    count: t.balance
                }
            })
            .sort((a: any, b: any) => a.count > b.count ? -1 : 1)
            .slice(0, size);
        const topNFTokensByBalances = tokens
            .filter((d: any) => d.tokenType === 'non-fungible')
            .map((t: any) => {
                return {
                    name: t.tokenName,
                    count: t.balance
                }
            })
            .sort((a: any, b: any) => a.count > b.count ? -1 : 1)
            .slice(0, size);
        const topPoliciesByDocuments = instances
            .map((i: any) => {
                return {
                    name: `${i.name} (${i.instanceTopicId})`,
                    count: i._documents.vc
                }
            })
            .sort((a: any, b: any) => a.count > b.count ? -1 : 1)
            .slice(0, size);
        const topPoliciesByVP = instances
            .map((i: any) => {
                return {
                    name: `${i.name} (${i.instanceTopicId})`,
                    count: i._documents.vp
                }
            })
            .sort((a: any, b: any) => a.count > b.count ? -1 : 1)
            .slice(0, size);
        const topPolicies = AnalyticsUtils.topRate(policies, 'name', size);
        const topVersion = AnalyticsUtils.topRate(instances, 'name', size);
        const topSrByUser = AnalyticsUtils.topRate(_users, 'owner', size);
        const topSrByPolicies = AnalyticsUtils.topRate(policies, 'owner', size);
        const topTokens = AnalyticsUtils.topRate(tokens, 'tokenName', size);

        console.timeEnd('ReportService.report')
        const report: any = {
            status: item.status,
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
            userTopic: userTopicCount,
            tokens: tokens.length,
            fTokens: ftCount,
            nfTokens: nftCount,
            tags: tagCount,
            schemas: schemaCount,
            systemSchemas: systemSchemaCount,
            revokeDocuments: revokeCount,
            fTotalBalances: ftBalance,
            nfTotalBalances: nftBalance,
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

    public static async csv(uuid: string): Promise<any> {
        console.log('ReportService.csv')
        console.time('ReportService.csv')
        const item = await new DataBaseHelper(Status).findOne({ uuid });

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
            tagCount,
            schemaCount,
            systemSchemaCount,
            ftCount,
            nftCount,
            ftBalance,
            nftBalance
        } = await ReportServiceService.loadData(item.uuid);

        console.time('csv: generate');
        console.log('csv: generate total csv');
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
            .addHeader('Revoke Documents', { width: 16, type: 'number' })
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
            .add(tagCount)
            .add(schemaCount)
            .add(systemSchemaCount)
            .addLine();

        //Users
        console.log('csv: generate users csv');
        const usersCSV = new Table('users');
        usersCSV
            .addHeader('DID', { width: 80 })
            .addHeader('Topic', { width: 16 })
            .addHeader('Account', { width: 16 })
            .addHeader('Type', { width: 20 })
            .addHeader('Standard Registry', { width: 80 });
        for (const item of users) {
            usersCSV
                .add(item.did)
                .add(item.topicId)
                .add(item.account)
                .add(item.type)
                .add(item.type === UserType.USER ? item.owner : '-')
                .addLine()
        }

        //Policies
        console.log('csv: generate policies csv');
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
            .addHeader('Revoke Documents', { width: 18, type: 'number' });
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
        console.log('csv: generate tokens csv');
        const tokensCSV = new Table('tokens');
        tokensCSV
            .addHeader('Creator (Account)', { width: 18 })
            .addHeader('Creator', { width: 80 })
            .addHeader('Token Id', { width: 16 })
            .addHeader('Token Name', { width: 30 })
            .addHeader('Token Symbol', { width: 16 })
            .addHeader('Token Type', { width: 16 })
            .addHeader('Balance', { width: 18, type: 'number' });
        for (const item of tokens) {
            tokensCSV
                .add(item.account)
                .add(item.owner)
                .add(item.tokenId)
                .add(item.tokenName)
                .add(item.tokenSymbol)
                .add(item.tokenType)
                .add(item.balance)
                .addLine()
        }

        //Instances
        console.log('csv: generate instances csv');
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
            .addHeader('Revoke Documents', { width: 18, type: 'number' });
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
        console.log('csv: generate modules csv');
        const modulesCSV = new Table('modules');
        modulesCSV
            .addHeader('Creator (Account)', { width: 18 })
            .addHeader('Creator', { width: 80 })
            .addHeader('Module Name', { width: 30 })
            .addHeader('Module Description', { width: 30 });
        for (const item of modules) {
            modulesCSV
                .add(item.account)
                .add(item.owner)
                .add(item.name)
                .add(item.description)
                .addLine()
        }
        console.timeEnd('csv: generate');

        console.timeEnd('ReportService.csv');
        return [
            totalCSV,
            usersCSV,
            policiesCSV,
            tokensCSV,
            instancesCSV,
            modulesCSV
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
