import { IPFSService } from "src/app/services/ipfs.service";
import { firstValueFrom } from 'rxjs';

interface DocumentData {
    document: any;
    params: any;
    history: any[];
}

interface IpfsMatch {
    fullMatch: string;
    cid: string;
    index: number;
}

export class IpfsTransformationUIAddonCode {
    private readonly ipfsPattern: RegExp = /ipfs:\/\/([a-zA-Z0-9]+)/g;
    private cache: Map<string, string> = new Map();
    
    constructor(
        private config: any,
        private ipfsService: IPFSService,
        private dryRun: boolean
    ) {}

    public async run(data: DocumentData): Promise<DocumentData> {
        try {
            const documentStr = JSON.stringify(data.document);
            const matches = this.findIpfsMatches(documentStr);
            
            if (matches.length === 0) {
                return data;
            }

            const documentWithReplacements = await this.replaceIpfsLinks(documentStr, matches);
            data.document = JSON.parse(documentWithReplacements);
            
            return data;
        } catch (error) {
            console.error('Error processing IPFS transformations:', error);
            throw error
        }
    }

    private findIpfsMatches(documentStr: string): IpfsMatch[] {
        const matches: IpfsMatch[] = [];
        let match: RegExpExecArray | null;
        
        while ((match = this.ipfsPattern.exec(documentStr)) !== null) {
            matches.push({
                fullMatch: match[0],
                cid: match[1],
                index: match.index
            });
        }
        
        return matches;
    }

    private async replaceIpfsLinks(documentStr: string, matches: IpfsMatch[]): Promise<string> {
        const replacements = await Promise.all(
            matches.map(match => this.processIpfsMatch(match))
        );

        let newDocument = documentStr;
        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            newDocument = this.replaceAt(newDocument, match.index, match.fullMatch.length, replacements[i]);
        }

        return newDocument;
    }

    private async processIpfsMatch(match: IpfsMatch): Promise<string> {
        if (!match.cid) {
            return match.fullMatch;
        } 
        
        if (this.cache.has(match.cid)) {
            return this.cache.get(match.cid)!;
        }

        try {
            const arrayBuffer = await this.loadFileFromIpfs(match.cid);
            const base64 = this.arrayBufferToBase64(arrayBuffer);
            const result = `base64:${base64}`;
            this.cache.set(match.cid, result);
            return result;
        } catch (error) {
            console.error(`processIpfsMatch by CID ${match.cid}:`, error);
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

    private replaceAt(str: string, index: number, length: number, replacement: string): string {
        return str.substring(0, index) + replacement + str.substring(index + length);
    }
}