import JSZip from 'jszip';
export interface ILabelComponents {
    label: any;
}
export const LABEL_FILE_NAME = 'labels.json';
export async function parseLabelFile(zipFile: any): Promise<ILabelComponents | null> {
    try {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (!content.files[LABEL_FILE_NAME] || content.files[LABEL_FILE_NAME].dir) {
            throw new Error('Zip file is not a labels');
        }
        const labelString = await content.files[LABEL_FILE_NAME].async('string');
        const label = JSON.parse(labelString);
        return { label };
    } catch (error) {
        console.log('Failed to parse label')
        return null;
    }
}
