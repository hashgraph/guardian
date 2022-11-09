import { getVCField } from '@helpers/utils';
import { Report } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyReportBlock } from '@policy-engine/policy-engine.interface';
import {
    IPolicyReport,
    IReport,
    IReportItem,
    ITokenReport,
    IVCReport,
    IVPReport,
    SchemaEntity,
} from '@guardian/interfaces';
import { BlockActionError } from '@policy-engine/errors';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IPolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

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
    }
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
    async itemUserMap(documents: any[], map) {
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
     * Report user map
     * @param report
     */
    async reportUserMap(report: IReport) {
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

            const report: IReport = {
                vpDocument: null,
                vcDocument: null,
                mintDocument: null,
                policyDocument: null,
                policyCreatorDocument: null,
                documents
            }

            const vp = await ref.databaseServer.getVpDocument({ hash, policyId: ref.policyId });

            if (vp) {
                const vpDocument: IVPReport = {
                    type: 'VP',
                    title: 'Verified Presentation',
                    tag: vp.tag,
                    hash: vp.hash,
                    issuer: vp.owner,
                    username: vp.owner,
                    document: vp
                }
                report.vpDocument = vpDocument;

                const mintIndex = Math.max(1, vp.document.verifiableCredential.length - 1);
                const mint = vp.document.verifiableCredential[mintIndex];
                const mintDocument: ITokenReport = {
                    type: 'VC',
                    tokenId: getVCField(mint, 'tokenId'),
                    date: getVCField(mint, 'date'),
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
                report.mintDocument = mintDocument;
                variables.actionId = mint.id;
                variables.actionSubjectId = mint.credentialSubject[0].id;

                const documentIds = [];
                const documentSubjectIds = [];
                for (let i = 0; i < vp.document.verifiableCredential.length - 1; i++) {
                    const doc = vp.document.verifiableCredential[i];
                    documentIds.push(doc.id);
                    documentSubjectIds.push(doc.credentialSubject[0].id);
                }
                variables.documentId = documentIds[0];
                variables.documentSubjectId = documentSubjectIds[0];
                variables.documentIds = documentIds;
                variables.documentSubjectIds = documentSubjectIds;
            } else {
                const vc = await ref.databaseServer.getVcDocument({ hash, policyId: ref.policyId })

                if (vc) {
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
                }
            }

            const policy = await ref.databaseServer.getVcDocument({
                type: SchemaEntity.POLICY,
                policyId: ref.policyId
            });

            if (policy) {
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
                    type: SchemaEntity.POLICY,
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
            }

            const reportItems = ref.getItems();
            for (const reportItem of reportItems) {
                await reportItem.run(documents, variables);
            }

            await this.reportUserMap(report);

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
        } catch (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, null));
    }
}
