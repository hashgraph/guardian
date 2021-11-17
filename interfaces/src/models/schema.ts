import {ISchema} from '../interface/schema.interface';
import {SchemaEntity} from '../type/schema-entity.type';
import {SchemaStatus} from '../type/schema-status.type';

export class Schema {
    public id: string;
    public type: string;
    public entity: SchemaEntity;
    public readonly: boolean;
    public document: any;
    public fullDocument: any;
    public status: SchemaStatus;

    constructor(data: ISchema) {
        this.id = data.id;
        this.type = data.type;
        this.entity = data.entity;
        this.document = data.document;
        this.readonly = data.readonly;
        this.status = data.status || SchemaStatus.DRAFT;
        this.fullDocument = JSON.parse(JSON.stringify(data.document));
    }

    static map(data: ISchema[]): Schema[] {
        if(!data) {
            return null;
        }

        const schemes = data.map(e => new Schema(e));
        const ids: any = {};

        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            ids[schema.fullDocument['@id']] = schema.fullDocument;
        }

        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            const context = schema.fullDocument['@context'];
            const keys = Object.keys(context);
            for (let j = 0; j < keys.length; j++) {
                const key = keys[j];
                const id = context[key]['@id'];
                if (ids[id]) {
                    context[key] = ids[id]
                }
            }
        }
        return schemes;
    }
}
