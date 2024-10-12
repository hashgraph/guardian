import JSZip from 'jszip';
import { Theme } from '../entity/index.js';

/**
 * Theme components
 */
export interface IThemeComponents {
    theme: Theme;
}

/**
 * Theme import export
 */
export class ThemeImportExport {
    /**
     * Theme filename
     */
    public static readonly themeFileName = 'theme.json';

    /**
     * Load theme components
     * @param theme theme
     *
     * @returns components
     */
    public static async loadThemeComponents(theme: Theme): Promise<IThemeComponents> {
        return { theme };
    }

    /**
     * Generate Zip File
     * @param theme theme to pack
     *
     * @returns Zip file
     */
    public static async generate(theme: Theme): Promise<JSZip> {
        const components = await ThemeImportExport.loadThemeComponents(theme);
        const file = await ThemeImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components theme components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: IThemeComponents): Promise<JSZip> {
        const object = { ...components.theme };
        delete object.id;
        delete object._id;
        delete object.owner;
        delete object.createDate;
        delete object.updateDate;
        if (!Array.isArray(object.rules)) {
            object.rules = [];
        }
        const zip = new JSZip();
        zip.file(ThemeImportExport.themeFileName, JSON.stringify(object));
        return zip;
    }

    /**
     * Parse zip theme file
     * @param zipFile Zip file
     * @returns Parsed theme
     */
    public static async parseZipFile(zipFile: any): Promise<IThemeComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (!content.files[ThemeImportExport.themeFileName] || content.files[ThemeImportExport.themeFileName].dir) {
            throw new Error('Zip file is not a theme');
        }
        const themeString = await content.files[ThemeImportExport.themeFileName].async('string');
        const theme = JSON.parse(themeString);
        return { theme };
    }
}
