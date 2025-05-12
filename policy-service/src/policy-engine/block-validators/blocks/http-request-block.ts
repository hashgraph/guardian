import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';
import net from 'node:net';
import dns from 'node:dns/promises';

/**
 * Http request block
 */
export class HttpRequestBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'httpRequestBlock';

    private static validateProtocol(url: string): void {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol.replace(':', '').toLowerCase();

        const raw = process.env.ALLOWED_PROTOCOLS || '';
        const allowedProtocols = raw
            .split(',')
            .map(p => p.trim().toLowerCase())
            .filter(Boolean);

        if (!allowedProtocols.includes(protocol)) {
            throw new Error(
                `Protocol "${parsedUrl.protocol}" is not allowed. Allowed protocols: ${allowedProtocols.join(', ')}`
            );
        }
    }

    private static isPrivateIP(ip: string, family: number): boolean {
        if (family === 4) {
            const octets = ip.split('.').map(Number);
            if (octets.length !== 4 || octets.some(o => isNaN(o))) {
                return false;
            }

            const [a, b] = octets;
            return (
                a === 10 ||
                (a === 172 && b >= 16 && b <= 31) ||
                (a === 192 && b === 168) ||
                a === 127 ||
                (a === 169 && b === 254)
            );
        }

        if (family === 6) {
            const normalized = ip.toLowerCase();

            return (
                normalized === '::1' ||
                normalized.startsWith('fc') ||
                normalized.startsWith('fd') ||
                normalized.startsWith('fe80')
            );
        }

        return false;
    }

    private static async validatePrivateIp(url: string): Promise<void> {
        const blockPrivate = process.env.BLOCK_PRIVATE_IP === 'true';
        if (!blockPrivate) {
            return;
        }

        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;

        const directFamily = net.isIP(hostname);
        if (directFamily) {
            if (HttpRequestBlock.isPrivateIP(hostname, directFamily)) {
                throw new Error(`Blocked request to private IP address: ${hostname}`);
            }
            return;
        }

        try {
            const { address, family } = await dns.lookup(hostname);
            if (HttpRequestBlock.isPrivateIP(address, family)) {
                throw new Error(`Blocked request to private IP address: ${address}`);
            }
        } catch (error) {
            throw new Error(`Failed to resolve host "${hostname}": ${error.message}`);
        }
    }

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);

            if (!ref.options.url?.trim()) {
                validator.addError('Option "url" must be set');
            }

            if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].find(item => item === ref.options.method?.toUpperCase())) {
                validator.addError(`Option "method" must be "GET", "POST", "PUT", "PATCH" or "DELETE"`);
            }

            try {
                HttpRequestBlock.validateProtocol(ref.options.url);
            } catch (error) {
                validator.addError(error.message);
            }

            try {
                await HttpRequestBlock.validatePrivateIp(ref.options.url);
            } catch (error) {
                validator.addError(error.message);
            }

        } catch (error) {
            validator.addError(
                `Unhandled exception ${validator.getErrorMessage(error)}`
            );
        }
    }
}
