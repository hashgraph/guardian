import { DocumentSignature, LocationType, Schema } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { BlockActionError } from '../errors/index.js';
import { ActionCallback } from '../helpers/decorators/index.js';
import { IPolicyEventState, IPolicyGetData, IPolicyRequestBlock } from '../policy-engine.interface.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { EventBlock } from '../helpers/decorators/event-block.js';
import { VcHelper, VcDocumentDefinition as VcDocument } from '@guardian/common';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

/**
 * Request VC document block
 */
@EventBlock({
    blockType: 'uploadVcDocumentBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Upload',
        title: `Add 'Upload' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.UI,

        properties: [
            {
                name: 'uiMetaData',
                label: 'UI',
                title: 'UI Properties',
                type: PropertyType.Group,
                properties: [
                    {
                        name: 'type',
                        label: 'Type',
                        title: 'Type',
                        type: PropertyType.Select,
                        items: [
                            {
                                label: 'Page',
                                value: 'page'
                            },
                            {
                                label: 'Dialog',
                                value: 'dialog'
                            }
                        ]
                    },
                    {
                        name: 'buttonClass',
                        label: 'Dialog button class',
                        title: 'Dialog button class',
                        type: PropertyType.Input
                    },
                    {
                        name: 'buttonText',
                        label: 'Dialog button text',
                        title: 'Dialog button text',
                        type: PropertyType.Input
                    },
                    {
                        name: 'dialogTitle',
                        label: 'Dialog title',
                        title: 'Dialog title',
                        type: PropertyType.Input
                    },
                    {
                        name: 'dialogClass',
                        label: 'Dialog class',
                        title: 'Dialog class',
                        type: PropertyType.Input
                    },
                    {
                        name: 'dialogDescription',
                        label: 'Dialog description',
                        title: 'Dialog description',
                        type: PropertyType.Input
                    },
                    {
                        name: 'pageTitle',
                        label: 'Page title',
                        title: 'Page title',
                        type: PropertyType.Input
                    },
                    {
                        name: 'pageDescription',
                        label: 'Page description',
                        title: 'Page description',
                        type: PropertyType.Input
                    }
                ]
            }
        ],
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.RefreshEvent,
            PolicyInputEventType.RestoreEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class UploadVcDocumentBlock {
    /**
     * Schema
     * @private
     */
    private schema: Schema | null;

    /**
     * Get Schema
     */
    async getSchema(): Promise<Schema> {
        if (!this.schema) {
            const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
            const schema = await PolicyUtils.loadSchemaByID(ref, ref.options.schema);
            this.schema = schema ? new Schema(schema) : null;
            if (!this.schema) {
                throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
            }
        }
        return this.schema;
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const options = PolicyComponentsUtils.GetBlockUniqueOptionsObject(this);
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);

        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            uiMetaData: options.uiMetaData || {},
        };
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    async setData(user: PolicyUser, data: any, _, actionStatus: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);

        if (!user.did) {
            throw new BlockActionError('User have no any did', ref.blockType, ref.uuid);
        }

        const retArray: unknown[] = [];
        const badArray: unknown[] = [];

        try {
            for (const document of data.documents) {
                let verify: boolean;
                try {
                    const VCHelper = new VcHelper();
                    const res = await VCHelper.verifySchema(document);
                    verify = res.ok;
                    if (verify) {
                        verify = await VCHelper.verifyVC(document);
                    }
                } catch (error) {
                    ref.error(`Verify VC: ${PolicyUtils.getErrorMessage(error)}`)
                    verify = false;
                }

                if (verify) {
                    ;
                    const vc = VcDocument.fromJsonTree(document);

                    const doc = PolicyUtils.createVC(ref, user, vc, actionStatus?.id);
                    doc.type = ref.options.entityType;
                    doc.schema = ref.options.schema;
                    doc.signature = DocumentSignature.VERIFIED;

                    retArray.push(doc);
                } else {
                    badArray.push(document);
                    // PolicyComponentsUtils.BlockErrorFn(ref.blockType, `Set data: document ${document.id} unverified`, user);
                }
            }

            const state: IPolicyEventState = { data: retArray };
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state, actionStatus);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null, actionStatus);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state, actionStatus);
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, user, {
                documents: ExternalDocuments(retArray)
            }));

            ref.backup();

            return {
                verified: retArray,
                invalid: badArray
            };
        } catch (error) {
            ref.error(`setData: ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }
}
