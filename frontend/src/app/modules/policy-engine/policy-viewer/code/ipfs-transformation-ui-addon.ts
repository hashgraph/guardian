import { IPFSService } from "src/app/services/ipfs.service";
import { firstValueFrom } from 'rxjs';

export class IpfsTransformationUIAddonCode {
    private config: any;
    private ipfsService: IPFSService;
    private dryRun: any;
    
    private readonly ipfsPattern: RegExp = /ipfs:\/\/([a-zA-Z0-9]+)/g;

    constructor(config: any, ipfsService: IPFSService, dryRun: any) {
        this.config = config;
        this.ipfsService = ipfsService;
        this.dryRun = dryRun;
    }

    public async run(data: {
        document: any,
        params: any,
        history: any[]
    }): Promise<any> {
        let documentStr = JSON.stringify(data.document);

        const ipfsMatches: RegExpExecArray[] = [];
        let match: RegExpExecArray | null;
        while ((match = this.ipfsPattern.exec(documentStr)) !== null) {
            ipfsMatches.push(match);
        }

        if (ipfsMatches.length === 0) {
            return data;
        }

        const promises = ipfsMatches.map(async (ipfsMatch): Promise<string> => {
            const fullLink = ipfsMatch[0];
            const cid = ipfsMatch[1];
            
            if (!cid) {
                return fullLink;
            }

            try {
                const arrayBuffer: ArrayBuffer = this.dryRun
                    ? await firstValueFrom(this.ipfsService.getFileFromDryRunStorage(cid))
                    : await firstValueFrom(this.ipfsService.getFile(cid));
                
                const base64 = btoa(
                    Array.from(new Uint8Array(arrayBuffer))
                        .map(b => String.fromCharCode(b))
                        .join('')
                );
                return `base64,${base64}`;
            } catch (error) {
                console.error(`Error loading file by CID ${cid}:`, error);
                return fullLink;
            }
        });

        const replacements = await Promise.all(promises);
        
        let newDocumentStr = documentStr;
        for (let i = ipfsMatches.length - 1; i >= 0; i--) {
            const start = ipfsMatches[i].index!;
            const end = start + ipfsMatches[i][0].length;
            newDocumentStr = 
                newDocumentStr.slice(0, start) + 
                replacements[i] + 
                newDocumentStr.slice(end);
        }

        data.document = JSON.parse(newDocumentStr);
        return data;
    }
}
