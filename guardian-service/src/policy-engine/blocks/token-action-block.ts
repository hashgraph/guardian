import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { IPolicyBlock, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { BlockActionError } from '@policy-engine/errors';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

/**
 * Information block
 */
@BasicBlock({
    blockType: 'tokenActionBlock',
    commonBlock: false,
    about: {
        label: 'Token Action',
        title: `Add 'Token Action' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    }
})
export class TokenActionBlock {
    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const { options } = PolicyComponentsUtils.GetBlockRef(this);
        return { uiMetaData: options.uiMetaData };
    }

    /**
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`runAction`);
        const field = ref.options.accountId;
        const documents = event?.data?.data;
        const doc = Array.isArray(documents) ? documents[0] : documents;

        let token;
        if (!ref.options.useTemplate) {
            token = await ref.databaseServer.getTokenById(
                ref.options.tokenId
            );
        }

        let account: IHederaAccount = null;
        if (doc) {
            if (field) {
                if (doc.accounts) {
                    account = {
                        did: null,
                        hederaAccountId: doc.accounts[field],
                        hederaAccountKey: null
                    }
                }
            } else {
                account = await PolicyUtils.getHederaAccount(ref, doc.owner);
            }
            if (ref.options.useTemplate) {
                if (doc.tokens) {
                    token = await ref.databaseServer.getTokenById(
                        doc.tokens[ref.options.template],
                        ref.dryRun
                    );
                }
            }
        }

        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        await PolicyUtils.checkAccountId(account);

        const policyOwner = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
        const associatedAccountInfo = await PolicyUtils.getHederaAccountInfo(ref, account.hederaAccountId, policyOwner);

        switch (ref.options.action) {
            case 'associate': {
                if (!associatedAccountInfo[token.tokenId]) {
                    await PolicyUtils.associate(ref, token, account);
                } else {
                    console.warn('Token already associated', ref.policyId);
                }
                break;
            }
            case 'dissociate': {
                if (associatedAccountInfo[token.tokenId]) {
                    await PolicyUtils.dissociate(ref, token, account);
                } else {
                    console.warn('Token is not associated', ref.policyId);
                }
                break;
            }
            case 'freeze': {
                if (associatedAccountInfo[token.tokenId] && associatedAccountInfo[token.tokenId].frozen === false) {
                    await PolicyUtils.freeze(ref, token, account, policyOwner);
                } else {
                    console.warn('Can not freeze token: token is not associated or it is frozen or it does not support freeze action', ref.policyId);
                }
                break;
            }
            case 'unfreeze': {
                if (associatedAccountInfo[token.tokenId] && associatedAccountInfo[token.tokenId].frozen === true) {
                    await PolicyUtils.unfreeze(ref, token, account, policyOwner);
                } else {
                    console.warn('Can not unfreeze token: token is not associated or it is not frozen or it does not support unfreeze action', ref.policyId);
                }
                break;
            }
            case 'grantKyc': {
                if (associatedAccountInfo[token.tokenId] && associatedAccountInfo[token.tokenId].kyc === false) {
                    await PolicyUtils.grantKyc(ref, token, account, policyOwner);
                } else if (associatedAccountInfo[token.tokenId]) {
                    console.warn('Can not grant kyc token: token is not associated or it is granted kyc or it does not support grant kyc action', ref.policyId);
                }
                break;
            }
            case 'revokeKyc': {
                if (associatedAccountInfo[token.tokenId] && associatedAccountInfo[token.tokenId].kyc === true) {
                    await PolicyUtils.revokeKyc(ref, token, account, policyOwner);
                } else {
                    console.warn('Can not grant kyc token: token is not associated or it is revoked kyc or it does not support revoke kyc action', ref.policyId);
                }
                break;
            }
            default:
                break;
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, null, null));
    }

    /**
     * Validate block data
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            const accountType = ['default', 'custom'];
            if (accountType.indexOf(ref.options.accountType) === -1) {
                resultsContainer.addBlockError(ref.uuid, 'Option "accountType" must be one of ' + accountType.join(','));
            }
            const types = ref.options.accountType === 'default' ? [
                'associate',
                'dissociate',
                'freeze',
                'unfreeze',
                'grantKyc',
                'revokeKyc',
            ] : [
                'freeze',
                'unfreeze',
                'grantKyc',
                'revokeKyc',
            ];
            if (types.indexOf(ref.options.action) === -1) {
                resultsContainer.addBlockError(ref.uuid, 'Option "action" must be one of ' + types.join(','));
            }
            if (ref.options.useTemplate) {
                if (!ref.options.template) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "template" does not set');
                }
                const policyTokens = ref.policyInstance.policyTokens || [];
                const tokenConfig = policyTokens.find(e => e.templateTokenTag === ref.options.template);
                if (!tokenConfig) {
                    resultsContainer.addBlockError(ref.uuid, `Token "${ref.options.template}" does not exist`);
                }
            } else {
                if (!ref.options.tokenId) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" does not set');
                } else if (typeof ref.options.tokenId !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" must be a string');
                } else if (!(await ref.databaseServer.getTokenById(ref.options.tokenId))) {
                    resultsContainer.addBlockError(ref.uuid, `Token with id ${ref.options.tokenId} does not exist`);
                }
            }
            if (ref.options.accountType === 'custom' && !ref.options.accountId) {
                resultsContainer.addBlockError(ref.uuid, 'Option "accountId" does not set');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
