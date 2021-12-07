import {SchemaLoader as ISchemaLoader} from 'vc-modules';
import {Guardians} from '@helpers/guardians';
import {Inject} from '@helpers/decorators/inject';

/**
 * VC documents loader
 */
export class SchemaLoader extends ISchemaLoader {
    @Inject()
    private guardians: Guardians;

    constructor() {
        super();
    }

    public async get(type: string): Promise<any> {
        const document = await this.guardians.loadSchema(type);
        if (!document) {
            throw new Error('Schema not found');
        }
        return document;
    }
}
