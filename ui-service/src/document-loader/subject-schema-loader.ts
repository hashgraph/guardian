import { SchemaLoader as ISchemaLoader } from 'vc-modules';
import { Guardians } from '@helpers/guardians';
import { Inject } from '@helpers/decorators/inject';
import { ISchema } from 'interfaces';

/**
 * Subject schema loader
 */
export class SubjectSchemaLoader extends ISchemaLoader {
    @Inject()
    private guardians: Guardians;

    constructor(private readonly context: string) {
        super();
    }

    public async has(context: string | string[], iri: string, type: string): Promise<boolean> {
        if (type !== 'subject') {
            return false;
        }
        if (Array.isArray(context)) {
            for (let i = 0; i < context.length; i++) {
                const element = context[i];
                if (element.startsWith(this.context)) {
                    return true;
                }
            }
        } else {
            return context && context.startsWith(this.context);
        }
        return false;
    }

    public async get(context: string | string[], iri: string, type: string): Promise<any> {
        let schemes: ISchema[];
        if (typeof context == 'string') {
            schemes = await this.guardians.loadSchemaContexts([context]);
        } else {
            schemes = await this.guardians.loadSchemaContexts(context);
        }

        if (!schemes) {
            throw new Error('Schema not found');
        }

        const _iri = '#' + iri;
        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            if (schema.iri === _iri) {
                if (!schema.document) {
                    throw new Error('Document not found');
                }
                const document = JSON.parse(schema.document);
                return document;
            }
        }
        throw new Error('Schema not found');
    }
}
