import JSZip from 'jszip';

export class ZipUtils {
    public static readonly NAME = 'result';

    public static async zipJson(json: any): Promise<string> {
        const zip = new JSZip();
        zip.file(ZipUtils.NAME, JSON.stringify(json));
        const arraybuffer = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 3
            },
            platform: 'UNIX',
        });
        const buffer = Buffer.from(arraybuffer);
        const base64String = buffer.toString('base64');
        return base64String;
    }

    public static async unZipJson(base64String: string): Promise<any> {
        const buffer = Buffer.from(base64String, 'base64');
        const arrayBuffer = buffer.buffer;
        const zip = new JSZip();
        const content = await zip.loadAsync(arrayBuffer);
        const jsonString = await content.files[ZipUtils.NAME].async('string');
        const json = JSON.parse(jsonString);
        return json;
    }

    public static async zipString(json: string): Promise<string> {
        const zip = new JSZip();
        zip.file(ZipUtils.NAME, json);
        const arraybuffer = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 3
            },
            platform: 'UNIX',
        });
        const buffer = Buffer.from(arraybuffer);
        const base64String = buffer.toString('base64');
        return base64String;
    }

    public static async unZipString(base64String: string): Promise<any> {
        const buffer = Buffer.from(base64String, 'base64');
        const arrayBuffer = buffer.buffer;
        const zip = new JSZip();
        const content = await zip.loadAsync(arrayBuffer);
        const jsonString = await content.files[ZipUtils.NAME].async('string');
        return jsonString;
    }
}