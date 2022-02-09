import { SchemaLoader } from 'vc-modules';
import { Schema } from '@entity/schema';
import { MongoRepository } from 'typeorm';
import { ISchema } from 'interfaces';

/**
 * Subject schema loader
 */
export class SubjectSchemaLoader extends SchemaLoader {
    constructor(
        private readonly schemaRepository: MongoRepository<Schema>,
        private readonly context: string
    ) {
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
            schemes = await this.loadSchemaContexts([context]);
        } else {
            schemes = await this.loadSchemaContexts(context);
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

        throw new Error('IRI Schema not found');
    }

    private async loadSchemaContexts(context: string[]): Promise<ISchema[]> {
        try {
            if (!context) {
                return null;
            }
            const schema = await this.schemaRepository.find({
                where: { contextURL: { $in: context } }
            });
            return schema
        }
        catch (error) {
            return null;
        }
    }
}
