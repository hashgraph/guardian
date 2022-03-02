import { IAuthUser } from '@auth/auth.interface';
import { Inject } from '@helpers/decorators/inject';
import { Guardians } from '@helpers/guardians';
import { getVCField } from '@helpers/utils';
import { Report } from '@policy-engine/helpers/decorators';
import { PolicyComponentsStuff } from '@policy-engine/policy-components-stuff';
import { IPolicyReportBlock } from '@policy-engine/policy-engine.interface';
import { IPolicyReport, IReport, IReportItem, ITokenReport, IVPReport, SchemaEntity } from 'interfaces';
import { BlockActionError } from '@policy-engine/errors';

@Report({
    blockType: 'reportBlock',
    commonBlock: false
})
export class ReportBlock {

    @Inject()
    public guardian: Guardians;

    async getData(user: IAuthUser, uuid, params): Promise<any> {
        const ref = PolicyComponentsStuff.GetBlockRef<IPolicyReportBlock>(this);
        try {
            const schemes = await this.guardian.getSchemesByOwner(null);

            if (!params || !params.hash) {
                return {
                    uiMetaData: ref.options.uiMetaData,
                    schemes: schemes,
                    data: null
                };
            }

            const vp = (await this.guardian.getVpDocuments({
                hash: params.hash
            }))[0];

            if (vp) {
                const documents: IReportItem[] = [];
                const report: IReport = {
                    vpDocument: null,
                    vcDocument: null,
                    mintDocument: null,
                    policyDocument: null,
                    policyCreatorDocument: null,
                    documents: documents
                }

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
                    tokenId: getVCField(mint, 'name'),
                    date: getVCField(mint, 'name'),
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

                const policy = (await this.guardian.getVcDocuments({
                    type: { $eq: SchemaEntity.POLICY },
                    policyId: ref.policyId
                }))[0];

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

                    const policyCreator = (await this.guardian.getVcDocuments({
                        type: { $eq: SchemaEntity.ROOT_AUTHORITY },
                        owner: policy.owner
                    }))[0];

                    if (policyCreator) {
                        const policyCreatorDocument: IReportItem = {
                            type: 'VC',
                            icon: 'account_circle',
                            title: 'RootAuthority',
                            description: 'Account Creation',
                            tag: 'Account Creation',
                            issuer: policy.owner,
                            username: policy.owner,
                            document: policyCreator
                        }
                        report.policyCreatorDocument = policyCreatorDocument;
                    }
                }

                const variables = {
                    policyId: ref.policyId,
                    owner: user.did
                };
                const reportItems = ref.getItems();
                for (let i = 0; i < reportItems.length; i++) {
                    const reportItem = reportItems[i];
                    await reportItem.run(documents, variables);
                }

                return {
                    uiMetaData: ref.options.uiMetaData,
                    schemes: schemes,
                    data: report
                };
            } else {
                return {
                    uiMetaData: ref.options.uiMetaData,
                    schemes: schemes,
                    data: null
                };
            }
        } catch (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }
}
