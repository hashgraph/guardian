import { Report } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyReportBlock } from '@policy-engine/policy-engine.interface';
import {
    IImpactReport,
    IPolicyReport,
    IReport,
    IReportItem,
    IVCReport,
    SchemaEntity,
} from '@guardian/interfaces';
import { BlockActionError } from '@policy-engine/errors';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IPolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import { VpDocument, VcDocument, getVCField } from '@guardian/common';

/**
 * Report block
 */
@Report({
    blockType: 'reportBlock',
    commonBlock: false,
    about: {
        label: 'Report',
        title: `Add 'Report' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
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
export class ReportBlock {
    /**
     * Block state
     * @private
     */
    private readonly state: { [key: string]: any } = {
        lastValue: null
    };

    /**
     * Get username
     * @param did
     * @param map
     */
    async getUserName(did: string, map: any): Promise<string> {
        if (!did) {
            return null;
        }
        if (map[did]) {
            return map[did];
        } else {
            const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);
            const curUser = await PolicyUtils.getUser(ref, did);
            if (curUser) {
                map[did] = curUser.username;
                return map[did];
            } else {
                return did;
            }
        }
    }

    /**
     * Item user map
     * @param documents
     * @param map
     */
    async itemUserMap(documents: any[], map: any) {
        if (!documents) {
            return;
        }
        for (const element of documents) {
            if (element.multiple) {
                for (const document of element.document) {
                    document.username = await this.getUserName(document.username, map);
                }
            } else {
                element.username = await this.getUserName(element.username, map);
            }
            await this.itemUserMap(element.documents, map);
        }
    }

    /**
     * Add report item by VP
     * @param report
     * @param variables
     * @param vp
     */
    private async addReportByVP(
        report: IReport,
        variables: any,
        vp: VpDocument,
        isMain: boolean = false
    ): Promise<IReport> {
        const vcs = vp.document.verifiableCredential || [];
        const mintIndex = Math.max(1, vcs.length - 1);
        const mint = vcs[mintIndex];
        report.vpDocument = {
            type: 'VP',
            title: 'Verified Presentation',
            tag: vp.tag,
            hash: vp.hash,
            issuer: vp.owner,
            username: vp.owner,
            document: vp
        }
        report.mintDocument = {
            type: 'VC',
            tokenId: getVCField(mint, 'tokenId'),
            date: getVCField(mint, 'date'),
            amount: getVCField(mint, 'amount'),
            tag: vp.tag,
            issuer: vp.owner,
            username: vp.owner,
            document: {
                owner: null,
                hash: null,
                type: null,
                policyId: null,
                tag: null,
                option: null,
                document: mint
            }
        }
        variables.actionId = mint.id;
        variables.actionSubjectId = mint.credentialSubject[0].id;

        report = await this.addReportByVCs(report, variables, vcs, vp);
        if (isMain) {
            report = await this.searchAdditionalDocuments(report, vcs, vp);
        }

        return report;
    }

    /**
     * Add report item by VCs
     * @param report
     * @param variables
     * @param vcs
     * @param vp
     */
    private async addReportByVCs(
        report: IReport,
        variables: any,
        vcs: any[],
        vp: VpDocument
    ): Promise<IReport> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);

        const dataSource: any[] = [];
        const impacts: IImpactReport[] = [];
        const documentIds: string[] = [];
        const documentSubjectIds: string[] = [];
        for (let i = 0; i < vcs.length - 1; i++) {
            const doc = vcs[i];
            const credentialSubject = doc.credentialSubject[0];
            if (credentialSubject.type === 'TokenDataSource') {
                dataSource.push(doc);
            } else if (credentialSubject.type === 'ActivityImpact') {
                impacts.push({
                    type: 'VC',
                    impactType: getVCField(doc, 'impactType'),
                    label: getVCField(doc, 'label'),
                    description: getVCField(doc, 'description'),
                    amount: getVCField(doc, 'amount'),
                    unit: getVCField(doc, 'unit'),
                    date: getVCField(doc, 'date'),
                    tag: vp.tag,
                    issuer: vp.owner,
                    username: vp.owner,
                    document: {
                        owner: null,
                        hash: null,
                        type: null,
                        policyId: null,
                        tag: null,
                        option: null,
                        document: doc
                    }
                });
            } else {
                documentIds.push(doc.id);
                documentSubjectIds.push(credentialSubject.id);
            }
        }
        if (dataSource.length) {
            const messageIds = [];
            for (const item of dataSource) {
                const ids = item.credentialSubject[0].dataSource;
                if (Array.isArray(ids)) {
                    for (const id of ids) {
                        messageIds.push(id);
                    }
                } else {
                    messageIds.push(ids);
                }
            }
            const items = await ref.databaseServer.getVcDocuments<VcDocument[]>({
                where: { messageId: { $in: messageIds } }
            });
            for (const item of items) {
                documentIds.push(item.document.id);
                documentSubjectIds.push(item.document.credentialSubject[0].id);
            }
        }
        if (impacts.length) {
            report.impacts = impacts;
        }
        variables.documentId = documentIds[0];
        variables.documentSubjectId = documentSubjectIds[0];
        variables.documentIds = documentIds;
        variables.documentSubjectIds = documentSubjectIds;
        return report;
    }

    /**
     * Add report item by VC
     * @param report
     * @param variables
     * @param vcs
     * @param vp
     */
    private async addReportByVC(report: IReport, variables: any, vc: VcDocument): Promise<IReport> {
        const vcDocument: IVCReport = {
            type: 'VC',
            title: 'Verifiable Credential',
            tag: vc.tag,
            hash: vc.hash,
            issuer: vc.owner,
            username: vc.owner,
            document: vc
        }
        report.vcDocument = vcDocument;
        variables.documentId = vc.document.id;
        variables.documentSubjectId = vc.document.credentialSubject[0].id;

        return report;
    }

    /**
     * Add report item by Policy
     * @param report
     * @param variables
     * @param policy
     */
    private async addReportByPolicy(report: IReport, variables: any, policy: VcDocument): Promise<IReport> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);

        const policyDocument: IPolicyReport = {
            type: 'VC',
            name: getVCField(policy.document, 'name'),
            description: getVCField(policy.document, 'description'),
            version: getVCField(policy.document, 'version'),
            tag: 'Policy Created',
            issuer: policy.owner,
            username: policy.owner,
            document: policy
        }
        report.policyDocument = policyDocument;

        const policyCreator = await ref.databaseServer.getVcDocument({
            type: SchemaEntity.STANDARD_REGISTRY,
            owner: policy.owner
        });

        if (policyCreator) {
            const policyCreatorDocument: IReportItem = {
                type: 'VC',
                title: 'StandardRegistry',
                description: 'Account Creation',
                visible: true,
                tag: 'Account Creation',
                issuer: policy.owner,
                username: policy.owner,
                document: policyCreator
            }
            report.policyCreatorDocument = policyCreatorDocument;
        }

        return report;
    }

    /**
     * Report user map
     * @param report
     */
    private async reportUserMap(report: IReport): Promise<IReport> {
        const map: any = {};
        if (report.vpDocument) {
            report.vpDocument.username = await this.getUserName(report.vpDocument.username, map);
        }
        if (report.vcDocument) {
            report.vcDocument.username = await this.getUserName(report.vcDocument.username, map);
        }
        if (report.mintDocument) {
            report.mintDocument.username = await this.getUserName(report.mintDocument.username, map);
        }
        if (report.policyDocument) {
            report.policyDocument.username = await this.getUserName(report.policyDocument.username, map);
        }
        if (report.policyCreatorDocument) {
            report.policyCreatorDocument.username = await this.getUserName(report.policyCreatorDocument.username, map);
        }
        await this.itemUserMap(report.documents, map);

        return report
    }

    /**
     * Search Additional Documents
     * @param report
     * @param vcs
     * @param vp
     */
    private async searchAdditionalDocuments(
        report: IReport,
        vcs: any[],
        vp: VpDocument
    ): Promise<IReport> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);
        const messageIds = [];
        for (let i = 0; i < vcs.length - 1; i++) {
            const doc = vcs[i];
            const credentialSubject = doc.credentialSubject[0];
            if (credentialSubject.type === 'TokenDataSource' && credentialSubject.relationships) {
                if (Array.isArray(credentialSubject.relationships)) {
                    for (const relationship of credentialSubject.relationships) {
                        messageIds.push(relationship);
                    }
                } else {
                    messageIds.push(credentialSubject.relationships);
                }
            }
        }
        const additionalReports = [];
        if (messageIds.length) {
            const additionalVps = await ref.databaseServer.getVpDocuments<VpDocument[]>({
                where: {
                    messageId: { $in: messageIds },
                    policyId: { $eq: ref.policyId }
                }
            });
            for (const additionalVp of additionalVps) {
                const additionalReport = await this.addReportByVP({}, {}, additionalVp);
                additionalReports.push(additionalReport);
            }
        }
        if (vp.messageId) {
            const additionalVps = await ref.databaseServer.getVpDocuments<VpDocument[]>({
                where: {
                    'document.verifiableCredential.credentialSubject.type': { $eq: 'TokenDataSource' },
                    'document.verifiableCredential.credentialSubject.relationships': { $eq: vp.messageId },
                    'policyId': { $eq: ref.policyId }
                }
            });
            for (const additionalVp of additionalVps) {
                const additionalReport = await this.addReportByVP({}, {}, additionalVp);
                additionalReports.push(additionalReport);
            }
        }
        if (additionalReports.length) {
            report.additionalDocuments = additionalReports;
        }
        return report;
    }

    /**
     * Get block data
     * @param user
     * @param uuid
     */
    async getData(user: IPolicyUser, uuid: string): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);
        try {
            const blockState = this.state[user.id] || {};
            if (!blockState.lastValue) {
                return {
                    hash: null,
                    uiMetaData: ref.options.uiMetaData,
                    data: null
                };
            }
            const hash = blockState.lastValue;

            const documents: IReportItem[] = [];

            const variables: any = {
                policyId: ref.policyId,
                owner: user.did
            };

            let report: IReport = {
                vpDocument: null,
                vcDocument: null,
                impacts: null,
                mintDocument: null,
                policyDocument: null,
                policyCreatorDocument: null,
                documents
            }

            const vp = await ref.databaseServer.getVpDocument({ hash, policyId: ref.policyId });
            if (vp) {
                report = await this.addReportByVP(report, variables, vp, true);
            } else {
                const vc = await ref.databaseServer.getVcDocument({ hash, policyId: ref.policyId })
                if (vc) {
                    report = await this.addReportByVC(report, variables, vc);
                }
            }

            const policy = await ref.databaseServer.getVcDocument({
                type: SchemaEntity.POLICY,
                policyId: ref.policyId
            });

            if (policy) {
                report = await this.addReportByPolicy(report, variables, policy);
            }

            const reportItems = ref.getItems();
            for (const reportItem of reportItems) {
                const [documentsNotFound] = await reportItem.run(
                    documents,
                    variables
                );
                if (documentsNotFound) {
                    break;
                }
            }

            report = await this.reportUserMap(report);
            if (report.additionalDocuments) {
                for (let i = 0; i < report.additionalDocuments.length; i++) {
                    report.additionalDocuments[i] = await this.reportUserMap(report.additionalDocuments[i]);
                }
            }

            return {
                hash,
                uiMetaData: ref.options.uiMetaData,
                data: report
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
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);
        try {
            const value = data.filterValue;
            const blockState = this.state[user.id] || {};
            blockState.lastValue = value;
            this.state[user.id] = blockState;
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
                value
            }));
        } catch (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }
}
