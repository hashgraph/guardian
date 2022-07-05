import { Inject } from '@helpers/decorators/inject';
import { getVCField } from '@helpers/utils';
import { Report } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '../policy-components-utils';
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
import { Users } from '@helpers/users';
import { getMongoRepository } from 'typeorm';
import { VpDocument } from '@entity/vp-document';
import { VcDocument } from '@entity/vc-document';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IAuthUser } from '@guardian/common';

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
     * Users helper
     */
    @Inject()
    public users: Users;

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
            const curUser = await this.users.getUserById(did);
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
    async itemUserMap(documents: IReportItem[], map) {
        if (!documents) {
            return;
        }
        for (const element of documents) {
            element.username = await this.getUserName(element.username, map);
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
    async getData(user: IAuthUser, uuid: string): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);
        try {
            const blockState = this.state[user.did] || {};
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

            const vp = await getMongoRepository(VpDocument).findOne({ hash, policyId: ref.policyId });

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

                const mint = vp.document.verifiableCredential[1];
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

                const doc = vp.document.verifiableCredential[0];
                variables.documentId = doc.id;
                variables.documentSubjectId = doc.credentialSubject[0].id;
            } else {
                const vc = await getMongoRepository(VcDocument).findOne({ hash, policyId: ref.policyId })

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

            const policy = await getMongoRepository(VcDocument).findOne({
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

                const policyCreator = await getMongoRepository(VcDocument).findOne({
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
    async setData(user: IAuthUser, data: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);
        try {
            const value = data.filterValue;
            const blockState = this.state[user.did] || {};
            blockState.lastValue = value;
            this.state[user.did] = blockState;
        } catch (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }
}
