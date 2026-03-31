import { IPFSService } from "src/app/services/ipfs.service";
import { firstValueFrom } from 'rxjs';
import { fileTypeFromBuffer } from 'file-type';
import { PolicyEngineService } from "src/app/services/policy-engine.service";

interface DocumentData {
    document: any;
    params: any;
    history: any[];
}

interface IpfsMatch {
    fullMatch: string;
    cid: string;
}

enum TransformationIpfsLinkType {
    Base64 = 'base64',
    IpfsGateway = 'ipfsGateway'
}

export class IpfsTransformationUIAddonCode {
    private readonly ipfsPattern: RegExp = /ipfs:\/\/([a-zA-Z0-9]+)/;
    private cache: Map<string, string> = new Map();

    private readonly transformationType: string;
    private readonly ipfsGatewayTemplate: string;
    private readonly mockId: string | null;

    constructor(
        private config: any,
        private policyEngineService: PolicyEngineService,
        private ipfsService: IPFSService,
        private dryRun: boolean
    ) {
        this.transformationType = this.config.transformationType;
        this.ipfsGatewayTemplate = this.config.ipfsGatewayTemplate;
        this.mockId = config.mockId;
    }

    public async run(data: DocumentData): Promise<DocumentData> {
        try {
            await this.processDocument(data.document);
            return data;
        } catch (error) {
            console.error('Error processing IPFS transformations:', error);
            throw error;
        }
    }

    private async processDocument(rootDocument: any): Promise<void> {
        if (!rootDocument || typeof (rootDocument) !== 'object') {
            return;
        }

        const stack: any[] = [rootDocument];
        const tasks: Promise<void | any>[] = [];

        while (stack.length) {
            const documentObject = stack.pop();
            if (Array.isArray(documentObject)) {
                for (let i = 0; i < documentObject.length; i++) {
                    const documentValue = documentObject[i];
                    if (typeof (documentValue) === 'string' && documentValue.startsWith('ipfs://')) {
                        tasks.push(this.processIpfsString(documentValue).then(res => {
                            documentObject[i] = res;
                        }));
                    } else if (documentValue && typeof (documentValue) === 'object') {
                        stack.push(documentValue);
                    }
                }
            } else {
                for (const key in documentObject) {
                    const value = documentObject[key];
                    if (typeof (value) === 'string' && value.startsWith('ipfs://')) {
                        tasks.push(this.processIpfsString(value).then(res => {
                            documentObject[key] = res;
                        }));
                    } else if (value && typeof (value) === 'object') {
                        stack.push(value);
                    }
                }
            }
        }

        if (tasks.length) {
            await Promise.all(tasks);
        }
    }


    private async processIpfsString(ipfsString: string): Promise<any> {
        const match = this.ipfsPattern.exec(ipfsString);
        if (!match) {
            return ipfsString;
        }

        const cid = match[1];

        if (this.transformationType === TransformationIpfsLinkType.IpfsGateway) {
            return this.convertToIpfsGateway(cid);
        } else if (this.transformationType === TransformationIpfsLinkType.Base64) {
            return await this.convertToBase64({ fullMatch: ipfsString, cid });
        }

        return ipfsString;
    }

    private convertToIpfsGateway(cid: string): any {
        let gatewayUrl = "";
        if (this.ipfsGatewayTemplate.includes('{cid}')) {
            gatewayUrl = this.ipfsGatewayTemplate.replace('{cid}', cid);
        } else {
            gatewayUrl = `${this.ipfsGatewayTemplate}/${cid}`;
        }
        return { resourceUrl: gatewayUrl };
    }

    private async convertToBase64(match: IpfsMatch): Promise<any> {
        if (!match.cid) {
            return match.fullMatch;
        }

        if (this.cache.has(match.cid)) {
            const cachedBase64 = this.cache.get(match.cid)!;
            return { base64String: cachedBase64 };
        }

        try {
            const arrayBuffer = await this.loadFileFromIpfs(match.cid);
            const dataUrl = await this.arrayBufferToDataUrl(arrayBuffer);
            this.cache.set(match.cid, dataUrl);

            return { base64String: dataUrl };
        } catch (error) {
            console.error(`convertToBase64 by CID ${match.cid}:`, error);
            return match.fullMatch;
        }
    }

    private async loadFileFromIpfs(cid: string): Promise<ArrayBuffer> {
        const isDryRun = this.dryRun === true;
        const file$ =
            this.mockId ? (
                this.policyEngineService.mockIpfsRequest(this.mockId, cid)
            ) : (
                isDryRun ?
                    this.ipfsService.getFileFromDryRunStorage(cid) :
                    this.ipfsService.getFile(cid)
            );
        return await firstValueFrom(file$);
    }

    private async arrayBufferToDataUrl(buffer: ArrayBuffer): Promise<string> {
        const base64 = this.arrayBufferToBase64(buffer);

        const fileType = await fileTypeFromBuffer(buffer);
        let mimeType = 'application/octet-stream';

        if (fileType) {
            mimeType = fileType.mime;
        } else if (this.isTextBuffer(buffer)) {
            mimeType = this.isCsvBuffer(buffer) ? 'text/csv' : 'text/plain';
        }

        return `data:${mimeType};base64,${base64}`;
    }

    private isTextBuffer(buffer: ArrayBuffer): boolean {
        const checkSize = Math.min(1024, buffer.byteLength);
        const chunk = new Uint8Array(buffer, 0, checkSize);
        for (let i = 0; i < chunk.length; i++) {
            const byte = chunk[i];
            if (byte === 0 || (byte < 9 || (byte > 13 && byte < 32)) && byte > 127) {
                return false;
            }
        }
        return true;
    }

    private isCsvBuffer(buffer: ArrayBuffer): boolean {
        try {
            const checkSize = Math.min(64 * 1024, buffer.byteLength);
            const chunk = new Uint8Array(buffer, 0, checkSize);

            // skip UTF-8 BOM
            let offset = 0;
            if (chunk[0] === 0xEF && chunk[1] === 0xBB && chunk[2] === 0xBF) {
                offset = 3;
            }

            const text = new TextDecoder().decode(chunk);
            const lines = text.split(/\r?\n/).slice(0, 5);

            const firstLine = lines[0].trim();
            if (!firstLine) {
                return false;
            }

            const delimiters = [',', ';', '\t'];

            for (const delimiter of delimiters) {
                const delimiterCount = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;

                if (delimiterCount > 0) {
                    const isConsistent = lines.slice(1, 4).every(line => {
                        const lineTrimmed = line.trim();
                        if (!lineTrimmed) {
                            return true;
                        }
                        const count = (lineTrimmed.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
                        return Math.abs(count - delimiterCount) <= 1;
                    });

                    if (isConsistent && !text.match(/<\w+>/)) {
                        return true;
                    }
                }
            }
            return false;
        } catch {
            return false;
        }
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const CHUNK_SIZE_IN_KB = 32 * 1024;
        const chunks: string[] = [];
        const bytes = new Uint8Array(buffer);

        for (let i = 0; i < bytes.length; i += CHUNK_SIZE_IN_KB) {
            const chunk = bytes.subarray(i, i + CHUNK_SIZE_IN_KB);
            chunks.push(String.fromCharCode(...chunk));
        }

        return btoa(chunks.join(''));
    }
}