import JSZip from 'jszip';
import { PolicyTool, Schema, Tag } from '../entity/index.js';
import { DatabaseServer } from '../database-modules/index.js';
import { ImportExportUtils } from './utils.js';

/**
 * Tool components
 */
export interface IToolComponents {
    tool: PolicyTool;
    schemas: Schema[];
    tags: Tag[];
    tools: PolicyTool[];
}

/**
 * Tool import export
 */
export class ToolImportExport {
    /**
     * Tool filename
     */
    public static readonly toolFileName = 'tool.json';

    /**
     * Load tool components
     * @param tool tool
     *
     * @returns components
     */
    public static async loadToolComponents(tool: PolicyTool): Promise<IToolComponents> {
        const topicId = tool.topicId;

        const dataBaseServer = new DatabaseServer();

        const schemas = await dataBaseServer.find(Schema, { topicId, readonly: false });
        const tagTargets: string[] = [];
        tagTargets.push(tool.id.toString());
        for (const schema of schemas) {
            tagTargets.push(schema.id.toString());
        }
        const tags = await DatabaseServer.getTags({ localTarget: { $in: tagTargets } });
        const toolIds = ImportExportUtils.findAllTools(tool.config);
        const tools = await dataBaseServer.find(PolicyTool, { messageId: { $in: toolIds } });
        return { tool, schemas, tags, tools };
    }

    /**
     * Generate Zip File
     * @param tool tool to pack
     *
     * @returns Zip file
     */
    public static async generate(tool: PolicyTool): Promise<JSZip> {
        const components = await ToolImportExport.loadToolComponents(tool);
        const file = await ToolImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components tool components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: IToolComponents): Promise<JSZip> {
        const toolObject = { ...components.tool };
        delete toolObject._id;
        delete toolObject.id;
        delete toolObject.uuid;
        delete toolObject.messageId;
        delete toolObject.status;
        delete toolObject.topicId;
        delete toolObject.createDate;
        delete toolObject.updateDate;
        delete toolObject.hash;
        delete toolObject.configFileId;

        const zip = new JSZip();

        const ZIP_FILE_OPTIONS = ImportExportUtils.getDeterministicZipFileOptions();

        zip.file(ToolImportExport.toolFileName, JSON.stringify(toolObject), ZIP_FILE_OPTIONS);

        ImportExportUtils.addDeterministicZipDir(zip, 'tags');
        for (let index = 0; index < components.tags.length; index++) {
            const tag = { ...components.tags[index] };
            delete tag.id;
            delete tag._id;
            tag.status = 'History';
            zip.file(`tags/${index}.json`, JSON.stringify(tag), ZIP_FILE_OPTIONS);
        }

        ImportExportUtils.addDeterministicZipDir(zip, 'ipfs');

        if (components.tags.length) {
            ImportExportUtils.addDeterministicZipDir(zip, 'ipfs/tags');
        }

        for (const tag of components.tags) {
            if (tag.document && tag.uuid) {
                const tagDocumentBuffer = Buffer.from(JSON.stringify(tag.document));
                zip.file(`ipfs/tags/${tag.uuid}.json`, tagDocumentBuffer, ZIP_FILE_OPTIONS);
            }
        }

        ImportExportUtils.addDeterministicZipDir(zip, 'schemas');
        for (const schema of components.schemas) {
            const item = { ...schema };
            delete item._id;
            delete item.id;
            delete item.status;
            delete item.readonly;
            item.id = schema.id.toString();
            zip.file(`schemas/${item.iri}.json`, JSON.stringify(item), ZIP_FILE_OPTIONS);
        }

        ImportExportUtils.addDeterministicZipDir(zip, 'tools');
        for (const tool of components.tools) {
            const item = {
                name: tool.name,
                description: tool.description,
                messageId: tool.messageId,
                owner: tool.creator,
                hash: tool.hash
            };
            zip.file(`tools/${tool.hash}.json`, JSON.stringify(item), ZIP_FILE_OPTIONS);
        }

        return zip;
    }

    /**
     * Parse zip tool file
     * @param zipFile Zip file
     * @returns Parsed tool
     */
    public static async parseZipFile(zipFile: any): Promise<IToolComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (!content.files[ToolImportExport.toolFileName] || content.files[ToolImportExport.toolFileName].dir) {
            throw new Error('Zip file is not a tool');
        }
        const toolString = await content.files[ToolImportExport.toolFileName].async('string');
        const tagsStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tags\/.+/.test(file[0]))
            .map(file => file[1].async('string')));
        const schemasStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^schemas\/.+/.test(file[0]))
            .map(file => file[1].async('string')));
        const toolsStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tools\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const tool = JSON.parse(toolString);
        const tags = tagsStringArray.map(item => JSON.parse(item)) || [];
        const schemas = schemasStringArray.map(item => JSON.parse(item));
        const tools = toolsStringArray.map(item => JSON.parse(item));
        return { tool, tags, schemas, tools };
    }
}
