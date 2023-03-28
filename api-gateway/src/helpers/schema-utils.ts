import { ISchema } from '@guardian/interfaces';
import JSZip from 'jszip';

/**
 * API Schema Utils
 */
export class SchemaUtils {
    /**
     * Parse zip archive
     * @param {any} zipFile
     * @returns {Promise<any[]>}
     */
    public static async parseZipFile(zipFile: any): Promise<any> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        const schemaStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => !/^tags\/.+/.test(file[0]))
            .map(file => file[1].async('string')));
        const schemas = schemaStringArray.map(item => JSON.parse(item));

        const tagsStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tags\/.+/.test(file[0]))
            .map(file => file[1].async('string')));
        const tags = tagsStringArray.map(item => JSON.parse(item));

        return { schemas, tags };
    }

    /**
     * Generate zip archive
     * @param {ISchema[]} schemas
     * @returns {@Promise<JSZip>>}
     */
    public static async generateZipFile(schemas: ISchema[], tags?: any[]): Promise<JSZip> {
        const zip = new JSZip();
        for (const schema of schemas) {
            zip.file(`${schema.iri}.json`, JSON.stringify(schema));
        }
        if (Array.isArray(tags)) {
            zip.folder('tags')
            for (let index = 0; index < tags.length; index++) {
                const tag = tags[index];
                zip.file(`tags/${index}.json`, JSON.stringify(tag));
            }
        }
        return zip;
    }

    /**
     * Convert schemas to old format
     * @param {ISchema | ISchema[]} schemas
     * @returns {ISchema | ISchema[]}
     */
    public static toOld<T extends ISchema | ISchema[]>(schemas: T): T {
        if (schemas) {
            if (Array.isArray(schemas)) {
                for (const schema of schemas) {
                    if (schema.document) {
                        schema.document = JSON.stringify(schema.document);
                    }
                    if (schema.context) {
                        schema.context = JSON.stringify(schema.context);
                    }
                }
                return schemas;
            } else {
                const schema: any = schemas;
                if (schema.document) {
                    schema.document = JSON.stringify(schema.document);
                }
                if (schema.context) {
                    schema.context = JSON.stringify(schema.context);
                }
                return schema;
            }
        }
        return schemas;
    }

    /**
     * Convert schema from old format
     * @param {ISchema} schema
     * @returns {ISchema}
     */
    public static fromOld(schema: ISchema): ISchema {
        if (schema && typeof schema.document === 'string') {
            schema.document = JSON.parse(schema.document);
        }
        if (schema && typeof schema.context === 'string') {
            schema.context = JSON.parse(schema.context);
        }
        return schema;
    }
}
