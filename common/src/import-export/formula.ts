import JSZip from 'jszip';
import { Formula } from '../entity/index.js';
import { IFormulaConfig } from '@guardian/interfaces';

/**
 * Formula components
 */
export interface IFormulaComponents {
    formula: Formula;
}

/**
 * Formula import export
 */
export class FormulaImportExport {
    /**
     * Formula filename
     */
    public static readonly formulaFileName = 'formula.json';

    /**
     * Load Formula components
     * @param formula Formula
     *
     * @returns components
     */
    public static async loadFormulaComponents(formula: Formula): Promise<IFormulaComponents> {
        return { formula };
    }

    /**
     * Generate Zip File
     * @param formula formula
     *
     * @returns Zip file
     */
    public static async generate(formula: Formula): Promise<JSZip> {
        const components = await FormulaImportExport.loadFormulaComponents(formula);
        const file = await FormulaImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components formula components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: IFormulaComponents): Promise<JSZip> {
        const object = { ...components.formula };
        delete object.id;
        delete object._id;
        delete object.owner;
        delete object.createDate;
        delete object.updateDate;
        const zip = new JSZip();
        zip.file(FormulaImportExport.formulaFileName, JSON.stringify(object));
        return zip;
    }

    /**
     * Parse zip formula file
     * @param zipFile Zip file
     * @returns Parsed formula
     */
    public static async parseZipFile(zipFile: any): Promise<IFormulaComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (
            !content.files[FormulaImportExport.formulaFileName] ||
            content.files[FormulaImportExport.formulaFileName].dir
        ) {
            throw new Error('Zip file is not a formula');
        }
        const formulaString = await content.files[FormulaImportExport.formulaFileName].async('string');
        const formula = JSON.parse(formulaString);
        return { formula };
    }

    /**
     * Validate Config
     *
     * @param data config
     */
    public static validateConfig(data?: IFormulaConfig): IFormulaConfig {
        return data;
    }
}
