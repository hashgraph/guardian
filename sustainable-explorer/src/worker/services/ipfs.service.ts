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
     * Fetches content from IPFS by RACING all configured gateways in parallel
     * and returning the first successful response. Pending requests to slower
     * gateways are aborted as soon as one wins.
     *
     * Why race instead of fall-through: a slow gateway with a 180s timeout used
     * to block the next gateway entirely. With racing, even one fast gateway
     * gives us sub-second results regardless of how many slow ones we configure.
     *
     * Throws only when EVERY gateway has rejected.
     */
    async fetchContent(cid: string): Promise<Buffer> {
        const v1Cid = this.toV1Base32(cid);
        if (this.gateways.length === 0) {
            throw new Error(`No IPFS gateways configured for CID ${cid}`);
        }

        const controllers = this.gateways.map(() => new AbortController());
        const errors: string[] = [];

        const attempts = this.gateways.map((gateway, i) => {
            const url = gateway.includes('${cid}')
                ? gateway.replace('${cid}', v1Cid)
                : `${gateway}${v1Cid}`;
            return axios
                .get(url, {
                    timeout: this.timeout,
                    responseType: 'arraybuffer',
                    signal: controllers[i].signal as unknown as AbortSignal,
                })
                .then((response) => {
                    this.logger.debug(`IPFS win: ${url}`);
                    return Buffer.from(response.data);
                })
                .catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : String(error);
                    // Filter out our own cancellations from the error list.
                    if (!message.includes('canceled') && !message.includes('aborted')) {
                        errors.push(`${gateway}: ${message}`);
                    }
                    throw error;
                });
        });

        try {
            const result = await Promise.any(attempts);
            // Cancel any still-in-flight slower gateway requests.
            controllers.forEach((c) => {
                try { c.abort(); } catch { /* noop */ }
            });
            return result;
        } catch {
            throw new Error(
                `All IPFS gateways failed for CID ${cid} (v1: ${v1Cid}): ${errors.join('; ')}`,
            );
        }
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
