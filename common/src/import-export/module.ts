import JSZip from 'jszip';
import { PolicyModule, Schema, Tag } from '../entity';
import { DataBaseHelper } from '../helpers';
import { DatabaseServer } from '../database-modules';

/**
 * Module components
 */
export interface IModuleComponents {
    module: PolicyModule;
    schemas: Schema[];
    tags: Tag[];
}

/**
 * Module import export
 */
export class ModuleImportExport {
    /**
     * Module filename
     */
    public static readonly moduleFileName = 'module.json';

    /**
     * Load module components
     * @param module module
     *
     * @returns components
     */
    public static async loadModuleComponents(module: PolicyModule): Promise<IModuleComponents> {
        const schemaIRIs = module.config.variables
            .filter(v => v.type === 'Schema')
            .map(v => v.baseSchema);

        const schemas = await new DataBaseHelper(Schema).find({ iri: { $in: schemaIRIs } });

        const tagTargets: string[] = [];
        tagTargets.push(module.id.toString());
        for (const schema of schemas) {
            tagTargets.push(schema.id.toString());
        }
        const tags = await DatabaseServer.getTags({ localTarget: { $in: tagTargets } });

        return { module, schemas, tags };
    }

    /**
     * Generate Zip File
     * @param module module to pack
     *
     * @returns Zip file
     */
    public static async generate(module: PolicyModule): Promise<JSZip> {
        const components = await ModuleImportExport.loadModuleComponents(module);
        const file = await ModuleImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components module components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: IModuleComponents): Promise<JSZip> {
        const moduleObject = { ...components.module };
        delete moduleObject._id;
        delete moduleObject.id;
        delete moduleObject.uuid;
        delete moduleObject.messageId;
        delete moduleObject.status;
        delete moduleObject.topicId;
        delete moduleObject.createDate;

        const zip = new JSZip();

        zip.file(ModuleImportExport.moduleFileName, JSON.stringify(moduleObject));

        zip.folder('tags');
        for (let index = 0; index < components.tags.length; index++) {
            const tag = { ...components.tags[index] };
            delete tag.id;
            delete tag._id;
            tag.status = 'History';
            zip.file(`tags/${index}.json`, JSON.stringify(tag));
        }

        zip.folder('schemas');
        for (const schema of components.schemas) {
            const item = { ...schema };
            delete item._id;
            delete item.id;
            delete item.status;
            delete item.readonly;
            item.id = schema.id.toString();
            zip.file(`schemas/${item.iri}.json`, JSON.stringify(item));
        }

        return zip;
    }

    /**
     * Parse zip module file
     * @param zipFile Zip file
     * @returns Parsed module
     */
    public static async parseZipFile(zipFile: any): Promise<IModuleComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (!content.files[ModuleImportExport.moduleFileName] || content.files[ModuleImportExport.moduleFileName].dir) {
            throw new Error('Zip file is not a module');
        }
        const moduleString = await content.files[ModuleImportExport.moduleFileName].async('string');
        const tagsStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tags\/.+/.test(file[0]))
            .map(file => file[1].async('string')));
        const schemasStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^schemas\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const module = JSON.parse(moduleString);
        const tags = tagsStringArray.map(item => JSON.parse(item)) || [];
        const schemas = schemasStringArray.map(item => JSON.parse(item));

        return { module, tags, schemas };
    }
}