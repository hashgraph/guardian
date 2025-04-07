import JSZip from 'jszip';
export interface IFormulaComponents {
    formula: any;
}
export const FORMULA_FILE_NAME = 'formula.json';
export async function parseFormulaFile(zipFile: any): Promise<IFormulaComponents | null> {
    try {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (!content.files[FORMULA_FILE_NAME] || content.files[FORMULA_FILE_NAME].dir) {
            throw new Error('Zip file is not a formula');
        }
        const formulaString = await content.files[FORMULA_FILE_NAME].async('string');
        const formula = JSON.parse(formulaString);
        return { formula };
    } catch (error) {
        console.log('Failed to parse formula')
        return null;
    }
}
