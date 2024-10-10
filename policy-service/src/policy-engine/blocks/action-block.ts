import { EventBlock } from '../helpers/decorators/index.js';
import { UserType, Schema } from '@guardian/interfaces';
import { findOptions } from '../helpers/find-options.js';
import { IPolicyAddonBlock, IPolicyDocument, IPolicyEventState, IPolicyInterfaceBlock } from '../policy-engine.interface.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { KeyType } from '@guardian/common';

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
    async getData(user: PolicyUser): Promise<any> {
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
    async setData(user: PolicyUser, document: IPolicyDocument): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);

        const state: IPolicyEventState = { data: document };

        let result: any = null;
        if (ref.options.type === 'selector') {
            const option = this.findOptions(document, ref.options.field, ref.options.uiMetaData.options);
            if (option) {
                const newUser = option.user === UserType.CURRENT
                    ? user
                    : await PolicyUtils.getDocumentOwner(ref, document);
                ref.triggerEvents(option.tag, newUser, state);
                ref.triggerEvents(PolicyOutputEventType.RefreshEvent, newUser, state);
            }
        }

        if (ref.options.type === 'dropdown') {
            const newUser = await PolicyUtils.getDocumentOwner(ref, document);
            ref.triggerEvents(PolicyOutputEventType.DropdownEvent, newUser, state);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, newUser, state);
        }

        if (ref.options.type === 'download') {
            const sensorDid = document.document.credentialSubject[0].id;
            const userDID = document.owner;
            const userCred = await PolicyUtils.getUserCredentials(ref, userDID);
            const hederaCred = await userCred.loadHederaCredentials(ref);
            const schemaObject = await PolicyUtils.loadSchemaByID(ref, ref.options.schema);
            const schema = new Schema(schemaObject);
            const didDocument = await userCred.loadSubDidDocument(ref, sensorDid);
            const sensorKey = await PolicyUtils.getAccountKey(ref, userDID, KeyType.KEY, sensorDid);
            result = {
                fileName: ref.options.filename || `${sensorDid}.config.json`,
                body: {
                    'url': ref.options.targetUrl || process.env.MRV_ADDRESS,
                    'topic': ref.policyInstance?.topicId,
                    'hederaAccountId': hederaCred.hederaAccountId,
                    'hederaAccountKey': hederaCred.hederaAccountKey,
                    'installer': userDID,
                    'did': sensorDid,
                    'key': sensorKey,
                    'type': schema.type,
                    'schema': schema.context,
                    'context': {
                        'type': schema.type,
                        '@context': [schema.contextURL]
                    },
                    'didDocument': didDocument.getPrivateDocument(),
                    'policyId': ref.policyId,
                    'policyTag': ref.policyInstance?.policyTag,
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
