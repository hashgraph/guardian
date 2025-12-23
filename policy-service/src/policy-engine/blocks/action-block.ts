import { ActionCallback, EventBlock } from '../helpers/decorators/index.js';
import { UserType, Schema, LocationType } from '@guardian/interfaces';
import { findOptions } from '../helpers/find-options.js';
import { IPolicyAddonBlock, IPolicyDocument, IPolicyEventState, IPolicyGetData, IPolicyInterfaceBlock } from '../policy-engine.interface.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { KeyType } from '@guardian/common';
import { PolicyActionsUtils } from '../policy-actions/utils.js';

/**
 * Document action clock with UI
 */
@EventBlock({
    blockType: 'interfaceActionBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
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
        output: [
            PolicyOutputEventType.RunEvent,
        ],
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
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);

        const data: IPolicyGetData = {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
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

        if (ref.options.type === 'transformation') {
            const children = [];
            for (const child of (ref.children as any[])) {
                if (child.blockClassName === 'UIAddon') {
                    if (typeof child.getData === 'function') {
                        const config = await child.getData(user);
                        children.push(config);
                    }
                }
            }
            data.children = children;
        }

        return data;
    }

    /**
     * Set block data
     * @param user
     * @param document
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent]
    })
    async setData(user: PolicyUser, document: IPolicyDocument, _, actionStatus): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);

        const state: IPolicyEventState = { data: document };

        let result: any = null;
        if (ref.options.type === 'selector') {
            const option = this.findOptions(document, ref.options.field, ref.options.uiMetaData.options);
            if (option) {
                const newUser = option.user === UserType.CURRENT
                    ? user
                    : await PolicyUtils.getDocumentOwner(ref, document, user.userId);
                await ref.triggerEvents(option.tag, newUser, state, actionStatus);
                await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, newUser, state, actionStatus);
            }
        }

        if (ref.options.type === 'dropdown') {
            const newUser = await PolicyUtils.getDocumentOwner(ref, document, user.userId);
            await ref.triggerEvents(PolicyOutputEventType.DropdownEvent, newUser, state, actionStatus);
            await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, newUser, state, actionStatus);
        }

        if (ref.options.type === 'download') {
            const sensorDid = document.document.credentialSubject[0].id;
            const userDID = document.owner;
            const schemaObject = await PolicyUtils.loadSchemaByID(ref, ref.options.schema);
            const schema = new Schema(schemaObject);
            const sensorKey = await PolicyUtils.getAccountKey(ref, userDID, KeyType.KEY, sensorDid, user.userId);
            const key = await PolicyActionsUtils.downloadPrivateDocument(ref, userDID, sensorDid, user.userId);
            result = {
                fileName: ref.options.filename || `${sensorDid}.config.json`,
                body: {
                    'url': ref.options.targetUrl || process.env.MRV_ADDRESS,
                    'topic': ref.policyInstance?.topicId,
                    'hederaAccountId': key.hederaAccountId,
                    'hederaAccountKey': key.hederaAccountKey,
                    'installer': userDID,
                    'did': sensorDid,
                    'key': sensorKey,
                    'type': schema.type,
                    'schema': schema.context,
                    'context': {
                        'type': schema.type,
                        '@context': [schema.contextURL]
                    },
                    'didDocument': key.didDocument,
                    'policyId': ref.policyId,
                    'policyTag': ref.policyInstance?.policyTag,
                    'ref': sensorDid
                }
            }
        }

        if (ref.options.type === 'transformation') {
            await ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state, actionStatus);
        }

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
            action: ref.options.type,
            documents: ExternalDocuments(document)
        }));
        ref.backup();

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
