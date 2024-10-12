import JSZip from 'jszip';
export interface IToolComponents {
    tool: any;
    schemas: any[];
    tags: any[];
    tools: any[];
}
export const TOOL_FILE_NAME = 'tool.json';
export async function parseToolFile(zipFile: any): Promise<any> {
    const zip = new JSZip();
    const content = await zip.loadAsync(zipFile);
    if (!content.files[TOOL_FILE_NAME] || content.files[TOOL_FILE_NAME].dir) {
        throw new Error('Zip file is not a tool');
    }
    const toolString = await content.files[TOOL_FILE_NAME].async('string');
    const tagsStringArray = await Promise.all(
        Object.entries(content.files)
            .filter((file) => !file[1].dir)
            .filter((file) => /^tags\/.+/.test(file[0]))
            .map((file) => file[1].async('string'))
    );
    const schemasStringArray = await Promise.all(
        Object.entries(content.files)
            .filter((file) => !file[1].dir)
            .filter((file) => /^schemas\/.+/.test(file[0]))
            .map((file) => file[1].async('string'))
    );
    const toolsStringArray = await Promise.all(
        Object.entries(content.files)
            .filter((file) => !file[1].dir)
            .filter((file) => /^tools\/.+/.test(file[0]))
            .map((file) => file[1].async('string'))
    );

    const tool = JSON.parse(toolString);
    const tags = tagsStringArray.map((item) => JSON.parse(item)) || [];
    const schemas = schemasStringArray.map((item) => JSON.parse(item));
    const tools = toolsStringArray.map((item) => JSON.parse(item));
    return { tool, tags, schemas, tools };
}
