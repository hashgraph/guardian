import { EventBlock } from '@policy-engine/helpers/decorators';
import { KeyType } from '@helpers/wallet';
import { UserType, Schema } from '@guardian/interfaces';
import { findOptions } from '@policy-engine/helpers/find-options';
import { IPolicyAddonBlock, IPolicyDocument, IPolicyInterfaceBlock } from '@policy-engine/policy-engine.interface';
import { DidDocumentBase } from '@hedera-modules';
import { PrivateKey } from '@hashgraph/sdk';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

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
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
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
    async setData(user: IPolicyUser, document: IPolicyDocument): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);

        const state: any = { data: document };

        let result: any = null;
        if (ref.options.type === 'selector') {
            const option = this.findOptions(document, ref.options.field, ref.options.uiMetaData.options);
            if (option) {
                const newUser = option.user === UserType.CURRENT
                    ? user
                    : PolicyUtils.getDocumentOwner(ref, document);
                ref.triggerEvents(option.tag, newUser, state);
                ref.triggerEvents(PolicyOutputEventType.RefreshEvent, newUser, state);
            }
        }

        if (ref.options.type === 'dropdown') {
            const newUser = PolicyUtils.getDocumentOwner(ref, document);
            ref.triggerEvents(PolicyOutputEventType.DropdownEvent, newUser, state);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, newUser, state);
        }

        if (ref.options.type === 'download') {
            const sensorDid = document.document.credentialSubject[0].id;
            const policy = await ref.databaseServer.getPolicy(ref.policyId);

            const userDID = document.owner;
            const hederaAccount = await PolicyUtils.getHederaAccount(ref, userDID);
            const sensorKey = await PolicyUtils.getAccountKey(ref, userDID, KeyType.KEY, sensorDid);
            const hederaAccountId = hederaAccount.hederaAccountId;
            const hederaAccountKey = hederaAccount.hederaAccountKey;
            const schemaObject = await ref.databaseServer.getSchemaByIRI(ref.options.schema);
            const schema = new Schema(schemaObject);
            const didDocument = await DidDocumentBase.createByPrivateKey(sensorDid, PrivateKey.fromString(sensorKey));
            result = {
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
                    'didDocument': await didDocument.getPrivateDidDocument(),
                    'policyId': ref.policyId,
                    'policyTag': policy.policyTag,
                    'ref': sensorDid
                }
            }
        }

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
            action: ref.options.type,
            documents: ExternalDocuments(document)
        }));

        return result;
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
                if (key === 'L' && Array.isArray(value)) {
                    value = value[value.length - 1];
                } else {
                    value = value[key];
                }
            }
        }
        return options.find(e => e.value === value);
    }
}
