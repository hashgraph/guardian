import JSZip from 'jszip';
import { Methodology } from '../entity/index.js';
import { IMethodologyConfig } from '@guardian/interfaces';

/**
 * Methodology components
 */
export interface IMethodologyComponents {
    methodology: Methodology;
}

/**
 * Methodology import export
 */
export class MethodologyImportExport {
    /**
     * Methodology filename
     */
    public static readonly methodologyFileName = 'methodology.json';

    /**
     * Load Methodology components
     * @param methodology Methodology
     *
     * @returns components
     */
    public static async loadMethodologyComponents(methodology: Methodology): Promise<IMethodologyComponents> {
        return { methodology };
    }

    /**
     * Generate Zip File
     * @param methodology methodology
     *
     * @returns Zip file
     */
    public static async generate(methodology: Methodology): Promise<JSZip> {
        const components = await MethodologyImportExport.loadMethodologyComponents(methodology);
        const file = await MethodologyImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components methodology components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: IMethodologyComponents): Promise<JSZip> {
        const object = { ...components.methodology };
        delete object.id;
        delete object._id;
        delete object.owner;
        delete object.createDate;
        delete object.updateDate;
        const zip = new JSZip();
        zip.file(MethodologyImportExport.methodologyFileName, JSON.stringify(object));
        return zip;
    }

    /**
     * Parse zip methodology file
     * @param zipFile Zip file
     * @returns Parsed methodology
     */
    public static async parseZipFile(zipFile: any): Promise<IMethodologyComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (
            !content.files[MethodologyImportExport.methodologyFileName] ||
            content.files[MethodologyImportExport.methodologyFileName].dir
        ) {
            throw new Error('Zip file is not a methodology');
        }
        const methodologyString = await content.files[MethodologyImportExport.methodologyFileName].async('string');
        const methodology = JSON.parse(methodologyString);
        return { methodology };
    }

    /**
     * Validate Config
     *
     * @param data config
     */
    public static validateConfig(data?: IMethodologyConfig): IMethodologyConfig {
        return data;
    }
}
