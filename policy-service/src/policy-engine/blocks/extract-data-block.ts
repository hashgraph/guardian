import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { PolicyUtils } from '../helpers/utils.js';
import { LocationType, Schema, SchemaField } from '@guardian/interfaces';
import { BlockActionError } from '../errors/index.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

/**
 * Extract block
 */
@BasicBlock({
    blockType: 'extractDataBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
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
            name: 'action',
            label: 'Action',
            title: 'Action',
            type: PropertyType.Select,
            items: [
                {
                    label: 'Get',
                    value: 'get'
                },
                {
                    label: 'Set',
                    value: 'set'
                }
            ],
            default: 'get'
        }, {
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

    private async getSchema(json: IPolicyDocument): Promise<Schema | null> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const config = await PolicyUtils.loadSchemaByID(ref, json.schema);
        if (config) {
            return new Schema(config);
        }
        return null;
    }

    private compareSchema(field: SchemaField, iri: string): boolean {
        if (field.isRef) {
            let type = field.type || '';
            if (!type.startsWith('#')) {
                type = '#' + type;
            }
            if (!iri.startsWith('#')) {
                iri = '#' + iri;
            }
            return type === iri;
        }
        return false;
    }

    private searchFieldsPath(json: IPolicyDocument, path: string): any {
        const result = [];
        const paths = (path || '').split('.');
        if (paths.length) {
            json = PolicyUtils.getCredentialSubject(json);
            this._searchFieldsPath(json, paths, 0, result);
        }
        return result;
    }

    private _searchFieldsPath(json: any, paths: string[], i: number, result: any[]): any {
        if (!json || typeof json !== 'object') {
            return;
        }
        if (Array.isArray(json)) {
            for (const item of json) {
                this._searchFieldsPath(item, paths, i, result);
            }
        } else {
            if (i < paths.length) {
                const key = paths[i];
                this._searchFieldsPath(json[key], paths, i + 1, result);
            } else if (json) {
                result.push(json);
            }
        }
    }

    private async extract(
        json: IPolicyDocument,
        schemaIRI: string,
        result: any[]
    ): Promise<void> {
        const schema = await this.getSchema(json);
        if (schema) {
            const fields = schema.searchFields((f) => this.compareSchema(f, schemaIRI));
            for (const field of fields) {
                const subJsons = this.searchFieldsPath(json, field.path);
                for (const subJson of subJsons) {
                    result.push(subJson);
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
        const schema = this._schema.type;
        const sources: IPolicyDocument[] = this.getDocuments(event.data.source);
        const data: IPolicyDocument[] = this.getDocuments(event.data.data);
        if (!sources || !data) {
            throw new BlockActionError(`Invalid documents`, ref.blockType, ref.uuid);
        }
        const sourceSubjects: any[] = [];
        for (const source of sources) {
            await this.extract(source, schema, sourceSubjects);
        }
        if (data.length !== sourceSubjects.length) {
            throw new BlockActionError(`Invalid documents count`, ref.blockType, ref.uuid);
        }
        for (let i = 0; i < sourceSubjects.length; i++) {
            const sourceSubject = sourceSubjects[i];
            const newDoc = data[i];
            const newSubject = newDoc.document?.credentialSubject;
            if (Array.isArray(newSubject)) {
                Object.assign(sourceSubject, newSubject[0]);
            } else if (newSubject) {
                Object.assign(sourceSubject, newSubject);
            }
        }
        const state = { data: sources };
        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, state, event.actionStatus);
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
            throw new BlockActionError(`Invalid documents`, ref.blockType, ref.uuid);
        }
        const subDocs: any[] = [];
        if (Array.isArray(docs)) {
            for (const doc of docs) {
                await this.extract(doc, schema, subDocs);
            }
        } else {
            await this.extract(docs, schema, subDocs);
        }

        const result: IPolicyDocument[] = [];
        for (const json of subDocs) {
            const vc = PolicyUtils.createVcFromSubject(json);
            result.push(PolicyUtils.createUnsignedVC(ref, vc, event.actionStatus?.id));
        }
        const state: IPolicyEventState = {
            source: docs,
            data: result
        };
        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, state, event.actionStatus);
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

        if (ref.options.action === 'set') {
            await this.setAction(ref, event);
        } else {
            await this.getAction(ref, event);
        }

        PolicyComponentsUtils.ExternalEventFn(
            new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
                action: ref.options.action,
                documents: ExternalDocuments(event.data.data)
            })
        );
        ref.backup();
    }
}
