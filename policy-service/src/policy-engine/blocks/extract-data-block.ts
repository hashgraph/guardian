import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import {
    SplitDocuments,
    Schema as SchemaCollection,
    VcHelper,
    VcDocumentDefinition as VcDocument,
} from '@guardian/common';
import { Schema, SchemaEntity } from '@guardian/interfaces';
import { BlockActionError } from '@policy-engine/errors';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import { Inject } from '@helpers/decorators/inject';

/**
 * Extract block
 */
@BasicBlock({
    blockType: 'extractDataBlock',
    commonBlock: false,
    about: {
        label: 'Extract Data',
        title: `Add 'Extract Data' Block`,
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
        defaultEvent: true,
        properties: [{
            name: 'schema',
            label: 'Schema',
            title: 'Schema',
            type: PropertyType.Schemas
        }]
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class ExtractDataBlock {
    /**
     * VC helper
     * @private
     */
    @Inject()
    private readonly vcHelper: VcHelper;

    /**
     * Schema
     * @private
     */
    private _schema: Schema;

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const schemaIRI = ref.options.schema;
        if (!schemaIRI) {
            throw new BlockActionError(
                `Schema IRI is empty`,
                ref.blockType,
                ref.uuid
            );
        }
        const schema = await PolicyUtils.loadSchemaByID(ref, schemaIRI);
        if (!schema) {
            throw new BlockActionError(
                `Can not find schema with IRI: ${schemaIRI}`,
                ref.blockType,
                ref.uuid
            );
        }
        this._schema = new Schema(schema);
    }

    private extract(
        json: any,
        schema: string,
        result: any[]
    ): void {
        if (typeof json !== 'object') {
            return;
        }
        if (Array.isArray(json)) {
            for (const item of json) {
                this.extract(item, schema, result);
            }
        } else {
            const entities = Object.entries(json);
            for (const [key, value] of entities) {
                if (key === 'type') {
                    if (value === schema) {
                        result.push(value);
                    }
                } else if (key !== '@context') {
                    this.extract(value, schema, result);
                }
            }
        }
    }

    /**
     * Get documents
     * @param data
     */
    private getDocuments(data: IPolicyDocument | IPolicyDocument[] | null | undefined): IPolicyDocument[] | null {
        if (Array.isArray(data)) {
            return data;
        } else if (data) {
            return [data];
        } else {
            return null;
        }
    }

    /**
     * Set action
     * @param ref
     * @param event
     */
    private async setAction(ref: IPolicyBlock, event: IPolicyEvent<IPolicyEventState>) {
        const schema = this._schema.contextURL;
        const sources: IPolicyDocument[] = this.getDocuments(event.data.source);
        const data: IPolicyDocument[] = this.getDocuments(event.data.data);
        if (!sources || !data) {
            throw new BlockActionError(`Invalid documents:`, ref.blockType, ref.uuid);
        }
        const subDocs: any[] = [];
        for (const source of sources) {
            this.extract(source, schema, subDocs);
        }
        if (data.length !== subDocs.length) {
            throw new BlockActionError(`Invalid documents count:`, ref.blockType, ref.uuid);
        }
        for (let i = 0; i < subDocs.length; i++) {
            const subDoc = subDocs[i];
            const newDoc = data[i];
            Object.assign(subDoc, newDoc);
        }

        const result: IPolicyDocument[] = [];
        const root = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
        for (const document of sources) {
            const owner: IPolicyUser = PolicyUtils.getDocumentOwner(ref, document);
            const vcDocument = document.document;
            const credentialSubject = vcDocument.credentialSubject[0];
            const vc: any = await this.vcHelper.createVC(
                root.did,
                root.hederaAccountKey,
                credentialSubject,
                null
            );
            let item = PolicyUtils.createVC(ref, owner, vc);
            item.type = document.type;
            item.schema = document.schema;
            item.assignedTo = document.assignedTo;
            item.assignedToGroup = document.assignedToGroup;
            item.option = Object.assign({}, document.option);
            item = PolicyUtils.setDocumentRef(item, document);
            result.push(item);
        }

        const state = { data: result };
        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, state);
    }

    /**
     * Get action
     * @param ref
     * @param event
     */
    private async getAction(ref: IPolicyBlock, event: IPolicyEvent<IPolicyEventState>) {
        const schema = this._schema.type;
        const docs: IPolicyDocument | IPolicyDocument[] = event.data.data;
        if (!docs) {
            throw new BlockActionError(`Invalid documents:`, ref.blockType, ref.uuid);
        }
        const subDocs: any[] = [];
        if (Array.isArray(docs)) {
            for (const doc of docs) {
                this.extract(doc, schema, subDocs);
            }
        } else {
            this.extract(docs, schema, subDocs);
        }

        const result: IPolicyDocument[] = [];
        for (const json of subDocs) {
            result.push({
                document: {
                    credentialSubject: [
                        json
                    ]
                }
            })
        }
        const state: IPolicyEventState = {
            source: docs,
            data: result
        };
        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, state);
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

        if (ref.options.type === 'set') {
            await this.setAction(ref, event);
        } else {
            await this.getAction(ref, event);
        }

        PolicyComponentsUtils.ExternalEventFn(
            new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
                type: ref.options.type,
                documents: ExternalDocuments(event.data.data)
            })
        );
    }
}
