import { TimeoutError } from '@guardian/interfaces';
import { PrivateKey } from '@hiero-ledger/sdk';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// 429 included: the mirror node rate limit is per source IP and is shared with every
// other process behind it, so a throttled GET is transient rather than fatal.
const TRANSIENT_STATUS_CODES = new Set<number>([429, 502, 503, 504]);
const TRANSIENT_ERROR_CODES = new Set<string>(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET']);
const MAX_RETRY_AFTER_MS = 60 * 1000;

// Retry 5xx gateway errors, 429 throttling and network timeouts, but not the rest of
// the 4xx range (e.g. 404 must fail fast).
function isTransientError(error: any): boolean {
    const status = error?.response?.status;
    if (typeof status === 'number') {
        return TRANSIENT_STATUS_CODES.has(status);
    }
    return !error?.response || TRANSIENT_ERROR_CODES.has(error?.code);
}

// `Retry-After` in seconds or as an HTTP date, in ms; null when absent/unusable.
function getRetryAfterMs(error: any): number | null {
    const value = error?.response?.headers?.['retry-after'];
    if (value === undefined || value === null) {
        return null;
    }
    const seconds = Number(value);
    if (isFinite(seconds)) {
        return seconds > 0 ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS) : null;
    }
    const date = Date.parse(String(value));
    if (isFinite(date)) {
        const wait = date - Date.now();
        return wait > 0 ? Math.min(wait, MAX_RETRY_AFTER_MS) : null;
    }
    return null;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Axios GET with exponential-backoff retry on transient failures. On final
 * failure rethrows an error prefixed with `source` so the failing fetch is
 * unambiguous in logs (e.g. 'Mirror node', 'IPFS gateway').
 */
export async function axiosGetWithRetry(
    source: string,
    url: string,
    config?: AxiosRequestConfig,
    options?: { attempts?: number; delay?: number }
): Promise<AxiosResponse> {
    const attempts = options?.attempts ??
        (process.env.REST_API_RETRY_COUNT ? parseInt(process.env.REST_API_RETRY_COUNT, 10) : 3);
    const baseDelay = options?.delay ??
        (process.env.REST_API_RETRY_DELAY ? parseInt(process.env.REST_API_RETRY_DELAY, 10) : 500);

    let lastError: any;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await axios.get(url, config);
        } catch (error) {
            lastError = error;
            if (attempt >= attempts || !isTransientError(error)) {
                break;
            }
            //a throttled response tells us how long to wait; honour it over our own backoff
            await delay(getRetryAfterMs(error) ?? baseDelay * Math.pow(2, attempt - 1));
        }
    }
    const reason = lastError?.message || 'Unknown error';
    const wrapped = new Error(`${source} request failed: ${reason}`);
    (wrapped as any).isTimeoutError = lastError?.isTimeoutError;
    throw wrapped;
}

/**
 * Timeout decorator
 * @param timeoutValue
 * @param messageError
 */
export function timeout(timeoutValue: number, messageError?: string) {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>) => {
        const oldFunc = descriptor.value;
        descriptor.value = async function () {
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(new TimeoutError(messageError || 'Transaction timeout exceeded'));
                }, timeoutValue);
            })
            return Promise.race([oldFunc.apply(this, arguments), timeoutPromise]);
        }
    }
}

/**
 * Hedera utils class
 */
export class HederaUtils {
    /**
     * Generate random key
     */
    public static randomKey(): string {
        const privateKey = PrivateKey.generate();
        return HederaUtils.encode(privateKey.toBytes());
    }

    /**
     * Encode
     * @param data
     */
    public static encode(data: Uint8Array): string {
        return Buffer.from(data).toString();
    }

    /**
     * Decode
     * @param text
     */
    public static decode(text: string): Uint8Array {
        return new Uint8Array(Buffer.from(text));
    }

    /**
     * Pars random key
     * @param key
     * @param notNull
     */
    public static parsPrivateKey(
        key: string | PrivateKey,
        notNull = true,
        keyName: string = 'Private Key'
    ): PrivateKey {
        if (key) {
            try {
                if (typeof key === 'string') {
                    return PrivateKey.fromString(key);
                } else {
                    return key;
                }
            } catch (error) {
                throw new Error(`Invalid ${keyName}`);
            }
        } else if (notNull) {
            throw new Error(`${keyName} is not set`);
        } else {
            return null;
        }
    }
}
