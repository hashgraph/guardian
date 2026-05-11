import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import CID from 'cids';

@Injectable()
export class IpfsService {
    private readonly logger = new Logger(IpfsService.name);
    private readonly gateways: string[];
    private readonly timeout: number;

    constructor(private readonly configService: ConfigService) {
        const gatewaysRaw = this.configService.get<string>('app.ipfs.gateways');
        if (typeof gatewaysRaw === 'string') {
            this.gateways = gatewaysRaw.split(',').map((g) => g.trim());
        } else {
            this.gateways = gatewaysRaw || [];
        }
        this.timeout = this.configService.get<number>('app.ipfs.fetchTimeout')!;
    }

    /**
     * Converts a CID to CIDv1 base32 format for gateway compatibility.
     * CIDv0 (Qm...) → CIDv1 (bafy...)
     * CIDv1 passes through unchanged.
     */
    private toV1Base32(cid: string): string {
        try {
            return new CID(cid).toV1().toString('base32');
        } catch {
            // If CID parsing fails, return as-is
            return cid;
        }
    }

    /**
     * Fetches content from IPFS by trying each configured gateway in order.
     * Converts CIDs to CIDv1 base32 format for maximum gateway compatibility.
     * Returns the raw content as a Buffer.
     * Throws if all gateways fail.
     */
    async fetchContent(cid: string): Promise<Buffer> {
        const v1Cid = this.toV1Base32(cid);
        const errors: string[] = [];

        for (const gateway of this.gateways) {
            // Support both URL template (${cid}) and path-suffix patterns
            const url = gateway.includes('${cid}')
                ? gateway.replace('${cid}', v1Cid)
                : `${gateway}${v1Cid}`;
            try {
                this.logger.debug(`Fetching IPFS: ${url}`);
                const response = await axios.get(url, {
                    timeout: this.timeout,
                    responseType: 'arraybuffer',
                });
                return Buffer.from(response.data);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.warn(`IPFS gateway failed: ${gateway} - ${message} ${url} ${cid}`);
                errors.push(`${gateway}: ${message} ${url} ${cid}`);
            }
        }

        throw new Error(
            `All IPFS gateways failed for CID ${cid} (v1: ${v1Cid}): ${errors.join('; ')}`,
        );
    }

    /**
     * Classifies an IPFS fetch error as permanent or transient.
     *
     * Permanent errors (404, 410, invalid CID) will never succeed on retry —
     * the processor should use UnrecoverableError to skip remaining BullMQ retries.
     *
     * Transient errors (network timeouts, 5xx, connection refused, etc.) may
     * succeed on a later attempt and should be retried normally.
     */
    static classifyError(error: Error): 'transient' | 'permanent' {
        const msg = (error.message || '').toLowerCase();
        if (
            msg.includes('404') ||
            msg.includes('not found') ||
            msg.includes('invalid cid') ||
            msg.includes('410') ||
            msg.includes('gone')
        ) {
            return 'permanent';
        }
        return 'transient';
    }

    /**
     * Basic CID validation. Returns the CID string if valid, null otherwise.
     * Supports CIDv0 (Qm...) and CIDv1 (bafy...) formats.
     */
    parseCID(value: string): string | null {
        if (!value || typeof value !== 'string') {
            return null;
        }
        try {
            new CID(value.trim());
            return value.trim();
        } catch {
            return null;
        }
    }
}
