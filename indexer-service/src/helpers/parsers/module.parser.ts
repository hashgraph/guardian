import JSZip from 'jszip';
export interface IModuleComponents {
    module: any;
    schemas: any[];
    tags: any[];
}
export const MODULE_FILE_NAME = 'module.json';
export async function parseModuleFile(zipFile: any): Promise<IModuleComponents> {
    const zip = new JSZip();
    const content = await zip.loadAsync(zipFile);
    if (
        !content.files[MODULE_FILE_NAME] ||
        content.files[MODULE_FILE_NAME].dir
    ) {
        throw new Error('Zip file is not a module');
    }
    const moduleString = await content.files[MODULE_FILE_NAME].async('string');
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

    const module = JSON.parse(moduleString);
    const tags = tagsStringArray.map((item) => JSON.parse(item)) || [];
    const schemas = schemasStringArray.map((item) => JSON.parse(item));

    return { module, tags, schemas };
}
