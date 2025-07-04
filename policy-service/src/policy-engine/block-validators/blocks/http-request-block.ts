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

    /**
     * Validates the protocol of the provided URL against allowed protocols from environment config.
     * Throws an error if the protocol is not allowed.
     *
     * @param url - The URL to validate
     */
    private static validateProtocol(url: string): void {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol.replace(':', '').toLowerCase();

        const raw = process.env.ALLOWED_PROTOCOLS || '';

        if (!raw) {
            throw new Error('There is no allowed protocols configured in environment variable ALLOWED_PROTOCOLS');
        }

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

    /**
     * Checks whether the given IP address belongs to a private or sensitive range.
     *
     * @param ip - IP address to check
     * @param family - IP family (4 or 6)
     * @returns true if the IP is private, false otherwise
     */
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

    /**
     * Validates that the URL does not resolve to a private IP address.
     * Performs direct IP checks and DNS resolution.
     * Throws an error if the resolved IP is private.
     *
     * @param url - The URL to validate
     */
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
     * Validate headers: excluded headers must not contain a value
     * @param headers
     */
    // tslint:disable-next-line:no-unused-variable
    private static validateHeadersIncluded(headers: any): void {
        if (!Array.isArray(headers)) {
            return;
        }

        for (const header of headers) {
            const name = header?.name?.toString()?.trim();
            const value = header?.value?.toString()?.trim();
            const included = header?.included;

            if (!name?.length) {
                throw new Error(
                    `All headers must have a name. Please enter a name or delete the header.`
                );
            }

            if (!included && value.length) {
                throw new Error(
                    `Header "${name}" is not included in export, but has a value. Please enable "Include" or clear the value.`
                );
            }
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
