import JSZip from 'jszip';
import { Tag } from '../entity/index.js';
import { ISchema } from '@guardian/interfaces';
import { ImportExportUtils } from './utils.js';

/**
 * Schema components
 */
export interface ISchemaComponents {
    schemas: ISchema[];
    tags: Tag[];
}

/**
 * Schema import export
 */
export class SchemaImportExport {
    /**
     * Generate Zip File
     * @param components schema components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: ISchemaComponents): Promise<JSZip> {
        const zip = new JSZip();

        const ZIP_FILE_OPTIONS = ImportExportUtils.getDeterministicZipFileOptions();

        for (const schema of components.schemas) {
            zip.file(`${schema.iri}.json`, JSON.stringify(schema), ZIP_FILE_OPTIONS);
        }
        if (Array.isArray(components.tags)) {
            ImportExportUtils.addDeterministicZipDir(zip, 'tags');
            for (let index = 0; index < components.tags.length; index++) {
                const tag = components.tags[index];
                zip.file(`tags/${index}.json`, JSON.stringify(tag), ZIP_FILE_OPTIONS);
            }
        }
        return zip;
    }

    /**
     * Parse zip schemas file
     * @param zipFile Zip file
     * @returns Parsed schemas
     */
    public static async parseZipFile(zipFile: any): Promise<ISchemaComponents> {
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
}
