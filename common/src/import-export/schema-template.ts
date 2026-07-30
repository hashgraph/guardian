import JSZip from 'jszip';
import { Schema, SchemaTemplate } from '../entity/index.js';
import { DatabaseServer } from '../database-modules/index.js';
import { ImportExportUtils } from './utils.js';
import { SchemaCategory } from '@guardian/interfaces';

/**
 * Schema template components.
 */
export interface ISchemaTemplateComponents {
    template: SchemaTemplate;
    schemas: Schema[];
}

/**
 * Schema template import export.
 */
export class SchemaTemplateImportExport {
    /**
     * Schema template filename.
     */
    public static readonly templateFileName = 'schema-template.json';

    /**
     * Load schema template components.
     * @param template schema template
     * @returns components
     */
    public static async loadComponents(template: SchemaTemplate): Promise<ISchemaTemplateComponents> {
        const schemas = template.topicId
            ? await DatabaseServer.getSchemas({
                topicId: template.topicId,
                category: SchemaCategory.TEMPLATE,
                readonly: false
            })
            : [];
        return { template, schemas: schemas as Schema[] };
    }

    /**
     * Generate schema template zip file.
     * @param template schema template
     * @returns zip file
     */
    public static async generate(template: SchemaTemplate): Promise<JSZip> {
        return await SchemaTemplateImportExport.generateZipFile(
            await SchemaTemplateImportExport.loadComponents(template)
        );
    }

    /**
     * Generate schema template zip file.
     * @param components schema template components
     * @returns zip file
     */
    public static async generateZipFile(components: ISchemaTemplateComponents): Promise<JSZip> {
        const templateObject = { ...components.template };
        delete templateObject._id;
        delete templateObject.id;
        delete templateObject.uuid;
        delete templateObject.messageId;
        delete templateObject.status;
        delete templateObject.topicId;
        delete templateObject.createDate;
        delete templateObject.updateDate;
        delete templateObject.configFileId;
        delete templateObject.contentFileId;

        const zip = new JSZip();
        const ZIP_FILE_OPTIONS = ImportExportUtils.getDeterministicZipFileOptions();

        zip.file(
            SchemaTemplateImportExport.templateFileName,
            JSON.stringify(templateObject),
            ZIP_FILE_OPTIONS
        );

        ImportExportUtils.addDeterministicZipDir(zip, 'schemas');
        for (const schema of components.schemas) {
            const item = { ...schema };
            delete item._id;
            delete item.id;
            delete item.status;
            delete item.readonly;
            delete item.messageId;
            delete item.topicId;
            delete item.templateId;
            delete item.createDate;
            delete item.updateDate;
            delete item.documentFileId;
            delete item.contextFileId;
            delete item.contentDocumentFileId;
            delete item.contentContextFileId;
            zip.file(`schemas/${item.iri}.json`, JSON.stringify(item), ZIP_FILE_OPTIONS);
        }

        return zip;
    }

    /**
     * Parse schema template zip file.
     * @param zipFile zip file
     * @returns parsed components
     */
    public static async parseZipFile(zipFile: any): Promise<ISchemaTemplateComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (
            !content.files[SchemaTemplateImportExport.templateFileName] ||
            content.files[SchemaTemplateImportExport.templateFileName].dir
        ) {
            throw new Error('Zip file is not a schema template');
        }

        const templateString = await content.files[SchemaTemplateImportExport.templateFileName].async('string');
        const schemasStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^schemas\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const template = JSON.parse(templateString);
        const schemas = schemasStringArray.map(item => JSON.parse(item));
        return { template, schemas };
    }
}
