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
import { AnalyticsTokenCache as TokenCache } from '../entity/analytics-token-cache';
import { ReportSteep } from '../interfaces/report-steep.type';
import { ReportStatus } from '../interfaces/report-status.type';
import { UserType } from '../interfaces/user.type';
import { AnalyticsUtils } from './utils';
import { DocumentType } from '../interfaces/document.type';
import { Tasks } from './tasks';

export class AnalyticsToken {
    public static async getTokenCache(uuid: string, tokenId: string, skip: boolean = false): Promise<TokenCache | null> {
        const tokenCache = await new DataBaseHelper(TokenCache).findOne({ uuid, tokenId });
        if (tokenCache) {
            if (skip) {
                return null;
            }
            return tokenCache;
        } else {
            return new DataBaseHelper(TokenCache).create({
                uuid,
                tokenId,
                balance: 0
            });
        }
    }

    public static async updateTokenCache(tokenCache: TokenCache): Promise<TokenCache> {
        return await new DataBaseHelper(TokenCache).save(tokenCache);
    }

    public static async searchByToken(
        report: Status,
        token: Token,
        skip: boolean = false
    ): Promise<Status> {
        try {
            const tokenCache = await AnalyticsToken.getTokenCache(report.uuid, token.tokenId, skip);
            if (!tokenCache) {
                return report;
            }
            let error: any;
            let balance:number = tokenCache.balance;
            try {
                const data = await AnalyticsUtils.getTokenInfo(token.tokenId);
                if (data) {
                    balance = parseFloat(data.total_supply);
                } else {
                    error = new Error('Invalid token info');
                }
            } catch (e) {
                console.log(e);
                error = e;
            }
            tokenCache.balance = balance;
            await AnalyticsToken.updateTokenCache(tokenCache);

            if (error) {
                report.error = String(error);
                return report;
            } else {
                return report;
            }
        } catch (e) {
            console.log(e);
            report.error = String(e);
            return report;
        }
    }

    public static async search(report: Status, skip: boolean = false): Promise<Status> {
        await AnalyticsUtils.updateStatus(report, ReportSteep.TOKENS, ReportStatus.PROGRESS);

        const row = await new DataBaseHelper(Token).find({
            uuid: report.uuid
        });
        const tokens = AnalyticsUtils.unique(row, 'tokenId')
        AnalyticsUtils.updateProgress(report, tokens.length);

        const task = async (token: Token): Promise<void> => {
            await AnalyticsToken.searchByToken(report, token, skip);
            AnalyticsUtils.updateProgress(report);
        }
        const tasks = new Tasks(tokens, task);
        await tasks.run(10);

        return report;
    }
}