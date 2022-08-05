import { EventBlock } from '@policy-engine/helpers/decorators';
import { KeyType } from '@helpers/wallet';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { UserType, Schema } from '@guardian/interfaces';
import { findOptions } from '@policy-engine/helpers/find-options';
import { IPolicyAddonBlock, IPolicyInterfaceBlock } from '@policy-engine/policy-engine.interface';
import { DidDocumentBase } from '@hedera-modules';
import { PrivateKey } from '@hashgraph/sdk';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';

/**
 * Document action clock with UI
 */
@EventBlock({
    blockType: 'interfaceActionBlock',
    commonBlock: false,
    about: {
        label: 'Action',
        title: `Add 'Action' Block`,
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
export class InterfaceDocumentActionBlock {
    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);

        const data: any = {
            id: ref.uuid,
            blockType: ref.blockType,
            type: ref.options.type,
            uiMetaData: ref.options.uiMetaData,
            user: ref.options.user
        }

        if (ref.options.type === 'selector') {
            data.field = ref.options.field;
        }

        if (ref.options.type === 'dropdown') {
            const documents: any[] = await ref.getSources(user, null);
            data.name = ref.options.name;
            data.value = ref.options.value;
            data.field = ref.options.field;
            data.options = documents.map((e) => {
                return {
                    name: findOptions(e, ref.options.name),
                    value: findOptions(e, ref.options.value),
                }
            });
        }
        return data;
    }

    /**
     * Set block data
     * @param user
     * @param document
     */
    async setData(user: IPolicyUser, document: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);

        const state: any = { data: document };

        if (ref.options.type === 'selector') {
            const option = this.findOptions(document, ref.options.field, ref.options.uiMetaData.options);
            if (option) {
                const ownerDid = option.user === UserType.CURRENT
                    ? user.did
                    : document.owner;
                const owner = await PolicyUtils.getPolicyUser(ref, ownerDid);
                ref.triggerEvents(option.tag, owner, state);
                ref.triggerEvents(PolicyOutputEventType.RefreshEvent, owner, state);
            }
            return;
        }

        if (ref.options.type === 'dropdown') {
            const owner = await PolicyUtils.getPolicyUser(ref, document.owner);
            ref.triggerEvents(PolicyOutputEventType.DropdownEvent, owner, state);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, owner, state);
            return;
        }

        if (ref.options.type === 'download') {
            const sensorDid = document.document.credentialSubject[0].id;
            const policy = await ref.databaseServer.getPolicy(ref.policyId);

            const hederaAccount = await PolicyUtils.getHederaAccount(ref, document.owner);
            const sensorKey = await PolicyUtils.getAccountKey(ref, document.owner, KeyType.KEY, sensorDid);
            const userDID = document.owner;
            const hederaAccountId = hederaAccount.hederaAccountId;
            const hederaAccountKey = hederaAccount.hederaAccountKey;
            const schemaObject = await ref.databaseServer.getSchemaByIRI(ref.options.schema);
            const schema = new Schema(schemaObject);
            const didDocument = DidDocumentBase.createByPrivateKey(sensorDid, PrivateKey.fromString(sensorKey));
            return {
                fileName: ref.options.filename || `${sensorDid}.config.json`,
                body: {
                    'url': ref.options.targetUrl || process.env.MRV_ADDRESS,
                    'topic': policy.topicId,
                    'hederaAccountId': hederaAccountId,
                    'hederaAccountKey': hederaAccountKey,
                    'installer': userDID,
                    'did': sensorDid,
                    'key': sensorKey,
                    'type': schema.type,
                    'schema': schema.context,
                    'context': {
                        'type': schema.type,
                        '@context': [schema.contextURL]
                    },
                    'didDocument': didDocument.getPrivateDidDocument(),
                    'policyId': ref.policyId,
                    'policyTag': policy.policyTag,
                    'ref': sensorDid
                }
            }
        }
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!ref.options.type) {
                resultsContainer.addBlockError(ref.uuid, 'Option "type" does not set');
            } else {
                switch (ref.options.type) {
                    case 'selector':
                        if (!ref.options.uiMetaData || (typeof ref.options.uiMetaData !== 'object')) {
                            resultsContainer.addBlockError(ref.uuid, 'Option "uiMetaData" does not set');
                        } else {
                            if (!ref.options.field) {
                                resultsContainer.addBlockError(ref.uuid, 'Option "field" does not set');
                            }
                            if (!ref.options.uiMetaData.options) {
                                resultsContainer.addBlockError(ref.uuid, 'Option "uiMetaData.options" does not set');
                            }
                            if (Array.isArray(ref.options.uiMetaData.options)) {
                                const tagMap = {};
                                for (const option of ref.options.uiMetaData.options) {
                                    if (!option.tag) {
                                        resultsContainer.addBlockError(ref.uuid, `Option "tag" does not set`);
                                    }

                                    if (tagMap[option.tag]) {
                                        resultsContainer.addBlockError(ref.uuid, `Option Tag ${option.tag} already exist`);
                                    }

                                    tagMap[option.tag] = true;
                                }
                            } else {
                                resultsContainer.addBlockError(ref.uuid, 'Option "uiMetaData.options" must be an array');
                            }
                        }
                        break;

                    case 'download':
                        if (!ref.options.targetUrl) {
                            resultsContainer.addBlockError(ref.uuid, 'Option "targetUrl" does not set');
                        }

                        if (!ref.options.schema) {
                            resultsContainer.addBlockError(ref.uuid, 'Option "schema" does not set');
                            break;
                        }
                        if (typeof ref.options.schema !== 'string') {
                            resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                            break;
                        }

                        const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema);
                        if (!schema) {
                            resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                            break;
                        }
                        break;

                    case 'dropdown':
                        if (!ref.options.name) {
                            resultsContainer.addBlockError(ref.uuid, 'Option "name" does not set');
                            break;
                        }
                        if (!ref.options.value) {
                            resultsContainer.addBlockError(ref.uuid, 'Option "value" does not set');
                            break;
                        }
                        break;

                    default:
                        resultsContainer.addBlockError(ref.uuid, 'Option "type" must be a "selector|download|dropdown"');
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }

    /**
     * Find options
     * @param document
     * @param field
     * @param options
     * @private
     */
    private findOptions(document: any, field: any, options: any[]) {
        let value: any = null;
        if (document && field) {
            const keys = field.split('.');
            value = document;
            for (const key of keys) {
                value = value[key];
            }
        }
        return options.find(e => e.value === value);
    }
}
