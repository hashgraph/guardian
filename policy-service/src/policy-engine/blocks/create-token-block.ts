import { PolicyUtils } from '../helpers/utils.js';
import { BlockActionError } from '../errors/index.js';
import { ActionCallback, StateField } from '../helpers/decorators/index.js';
import {
    IPolicyDocument,
    IPolicyEventState,
    IPolicyRequestBlock,
} from '../policy-engine.interface.js';
import {
    IPolicyEvent,
    PolicyInputEventType,
    PolicyOutputEventType,
} from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { EventBlock } from '../helpers/decorators/event-block.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import {
    insertVariables,
    MessageAction,
    MessageServer,
    TokenMessage,
} from '@guardian/common';
import {
    ExternalEvent,
    ExternalEventType,
} from '../interfaces/external-event.js';

/**
 * Create Token block
 */
@EventBlock({
    blockType: 'createTokenBlock',
    commonBlock: false,
    about: {
        label: 'Create Token',
        title: `Add 'Create Token' Block`,
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.UI,
        input: [PolicyInputEventType.RunEvent],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
        ],
        defaultEvent: true,
    },
    variables: [
        { path: 'options.template', alias: 'template', type: 'TokenTemplate' },
    ],
})
export class CreateTokenBlock {
    /**
     * Block state
     */
    @StateField()
    declare state: {
        [key: string]: any;
    };

    public async beforeInit(): Promise<void> {
        this.state = {
            tokenNumber: 0,
        };
    }

    private _prepareTokenTemplate(
        ref: IPolicyRequestBlock,
        template: any,
        documents: IPolicyDocument | IPolicyDocument[]
    ): any {
        if (!template) {
            throw new BlockActionError(
                'Token template is not defined',
                ref.blockType,
                ref.uuid
            );
        }
        const document = Array.isArray(documents) ? documents[0] : documents;
        const newTemplate = Object.assign({}, template);
        const templateFields = Object.keys(newTemplate);
        for (const fieldName of templateFields) {
            if (
                (fieldName !== 'wipeContractId' &&
                    newTemplate[fieldName] === '') ||
                newTemplate[fieldName] === null ||
                newTemplate[fieldName] === undefined
            ) {
                delete newTemplate[fieldName];
            }

            if (newTemplate.tokenName) {
                newTemplate.tokenName = insertVariables(
                    newTemplate.tokenName,
                    document
                );
            }
            if (newTemplate.tokenSymbol) {
                newTemplate.tokenSymbol = insertVariables(
                    newTemplate.tokenSymbol,
                    document
                );
            }
        }
        return newTemplate;
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<any> {
        const ref =
            PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        if (ref.options.autorun) {
            throw new BlockActionError(
                `Block is autorunable and doesn't return any data`,
                ref.blockType,
                ref.uuid
            );
        }
        const tokenTemplate = this._prepareTokenTemplate(
            ref,
            PolicyUtils.getTokenTemplate(ref, ref.options.template),
            Object.assign({}, this.state?.[user.id]?.data?.data, {
                index: this.state.tokenNumber,
            })
        );
        return {
            id: ref.uuid,
            blockType: ref.blockType,
            active: ref.isBlockActive(user),
            data: tokenTemplate,
            ...ref.options,
        };
    }

    private async _createToken(
        user,
        ref: IPolicyRequestBlock,
        template: any,
        docs: IPolicyDocument | IPolicyDocument[]
    ) {
        if (!template) {
            throw new BlockActionError(
                'Invalid token template',
                ref.blockType,
                ref.uuid
            );
        }

        const policyOwnerCred = await PolicyUtils.getUserCredentials(
            ref,
            ref.policyOwner
        );

        if (!docs) {
            throw new BlockActionError(
                'Documents is not defined',
                ref.blockType,
                ref.uuid
            );
        }

        // #region Create new token

        const createdToken = await PolicyUtils.createTokenByTemplate(
            ref,
            template,
            policyOwnerCred
        );
        // #endregion

        // #region Send new token to hedera
        const hederaCred = await policyOwnerCred.loadHederaCredentials(ref);
        const signOptions = await policyOwnerCred.loadSignOptions(ref);
        const rootTopic = await PolicyUtils.getInstancePolicyTopic(ref);
        const messageServer = new MessageServer(
            hederaCred.hederaAccountId,
            hederaCred.hederaAccountKey,
            signOptions,
            ref.dryRun
        ).setTopicObject(rootTopic);
        const tokenMessage = new TokenMessage(MessageAction.CreateToken);
        tokenMessage.setDocument(createdToken);
        await messageServer.sendMessage(tokenMessage);
        // #endregion

        // #region Set token in document
        if (Array.isArray(docs)) {
            for (const doc of docs) {
                if (!doc.tokens) {
                    doc.tokens = {};
                }
                doc.tokens[ref.options.template] = createdToken.tokenId;
            }
        } else {
            if (!docs.tokens) {
                docs.tokens = {};
            }
            docs.tokens[ref.options.template] = createdToken.tokenId;
        }

        delete this.state[user.id];
        await ref.saveState();
        // #endregion

        const state = { data: docs };
        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
        PolicyComponentsUtils.ExternalEventFn(
            new ExternalEvent(ExternalEventType.Set, ref, user, {
                tokenName: createdToken.tokenName,
                tokenSymbol: createdToken.tokenSymbol,
                tokenType: createdToken.tokenType,
                decimals: createdToken.decimals,
                initialSupply: createdToken.initialSupply,
                enableAdmin: createdToken.enableAdmin,
                enableFreeze: createdToken.enableFreeze,
                enableKYC: createdToken.enableKYC,
                enableWipe: createdToken.enableWipe,
            })
        );
    }

    /**
     * Set block data
     * @param user
     * @param _data
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
        ],
    })
    async setData(user: PolicyUser, template: any): Promise<any> {
        const ref =
            PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        ref.log(`setData`);

        if (ref.options.autorun) {
            throw new BlockActionError(
                `Block is autorunable and doesn't produce anything`,
                ref.blockType,
                ref.uuid
            );
        }

        if (!user.did) {
            throw new BlockActionError(
                'User have no any did',
                ref.blockType,
                ref.uuid
            );
        }

        try {
            await this._createToken(
                user,
                ref,
                Object.assign(
                    template,
                    this._prepareTokenTemplate(
                        ref,
                        PolicyUtils.getTokenTemplate(ref, ref.options.template),
                        Object.assign({}, this.state?.[user.id]?.data?.data, {
                            index: this.state.tokenNumber,
                        })
                    )
                ),
                this.state?.[user.id]?.data?.data
            );
            delete this.state?.[user.id];
            await ref.saveState();
        } catch (error) {
            ref.error(`setData: ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }

        return {};
    }

    /**
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [],
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref =
            PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        ref.log(`runAction`);

        const user = event.user;
        const eventData = event.data;

        if (!this.state.tokenNumber) {
            this.state.tokenNumber = 0;
        }

        this.state.tokenNumber++;
        await ref.saveState();

        if (ref.options.autorun) {
            await this._createToken(
                user,
                ref,
                this._prepareTokenTemplate(
                    ref,
                    PolicyUtils.getTokenTemplate(ref, ref.options.template),
                    Object.assign({}, eventData.data, {
                        index: this.state.tokenNumber,
                    })
                ),
                eventData.data
            );
        } else {
            if (!this.state.hasOwnProperty(user.id)) {
                this.state[user.id] = {
                    active: true,
                    data: eventData,
                };
            } else {
                this.state[user.id].data = eventData;
            }
            await ref.saveState();
        }

        PolicyComponentsUtils.ExternalEventFn(
            new ExternalEvent(ExternalEventType.Run, ref, user, null)
        );
    }
}
