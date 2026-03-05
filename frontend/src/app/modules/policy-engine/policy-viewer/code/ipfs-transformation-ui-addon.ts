import { IPFSService } from "src/app/services/ipfs.service";
import { firstValueFrom } from 'rxjs';
import { fileTypeFromBuffer } from 'file-type';

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
    
    constructor(
        private config: any,
        private ipfsService: IPFSService,
        private dryRun: boolean
    ) {
        this.transformationType = this.config.transformationType;
        this.ipfsGatewayTemplate = this.config.ipfsGatewayTemplate;
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

    private async processDocument(document: any): Promise<void> {
        if (!document || typeof(document) !== 'object') {
            return;
        }

        if (Array.isArray(document)) {
            for (let i = 0; i < document.length; i++) {
                if (typeof(document[i]) === 'string' && document[i].startsWith('ipfs://')) {
                    document[i] = await this.processIpfsString(document[i]);
                } else if (typeof(document[i]) === 'object' && document[i] !== null) {
                    await this.processDocument(document[i]);
                }
            }
        } else {
            for (const key in document) {
                const value = document[key];
                
                if (typeof(value) === 'string' && value.startsWith('ipfs://')) {
                    document[key] = await this.processIpfsString(value);
                } else if (typeof(value) === 'object' && value !== null) {
                    await this.processDocument(value);
                }
            }
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
        const file$ = isDryRun 
            ? this.ipfsService.getFileFromDryRunStorage(cid)
            : this.ipfsService.getFile(cid);
        
        return await firstValueFrom(file$);
    }

    private async arrayBufferToDataUrl(buffer: ArrayBuffer): Promise<string> {
        const base64 = this.arrayBufferToBase64(buffer);
        
        const fileType = await fileTypeFromBuffer(buffer);
        let mimeType = 'application/octet-stream'; 
        
        if (fileType) {
            mimeType = fileType.mime;
        }
        
        return `data:${mimeType};base64,${base64}`;
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