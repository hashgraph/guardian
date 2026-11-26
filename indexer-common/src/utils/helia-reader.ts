import { CustomError } from '../messages/message-response.js';

type VerifiedFetch = Awaited<ReturnType<typeof import('@helia/verified-fetch').createVerifiedFetch>>;

let verifiedFetch: Promise<VerifiedFetch> | undefined;
let invalidReaderWarned = false;

export function useHeliaReader(): boolean {
    const reader = process.env.IPFS_READER || 'kubo';
    if (reader === 'helia') {
        return true;
    }
    if (reader !== 'kubo' && !invalidReaderWarned) {
        invalidReaderWarned = true;
        console.warn(`Unknown IPFS_READER "${reader}", using kubo.`);
    }
    return false;
}

export function getHeliaOptions(env: NodeJS.ProcessEnv = process.env) {
    const list = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
    const routers = env.IPFS_HELIA_ROUTERS?.trim();
    return {
        gateways: list(env.IPFS_HELIA_GATEWAYS || ''),
        ...(routers ? { routers: routers === 'none' ? [] : list(routers) } : {}),
        allowInsecure: list(env.IPFS_HELIA_ALLOWED_PROTOCOLS || 'https')
            .some(protocol => protocol.toLowerCase() === 'http'),
        allowLocal: env.IPFS_HELIA_ALLOW_LOCAL_ADDRESSES === 'true',
    };
}

function getHeliaReader(): Promise<VerifiedFetch> {
    if (!verifiedFetch) {
        const options = getHeliaOptions();
        verifiedFetch = import('@helia/verified-fetch')
            .then(({ createVerifiedFetch }) => createVerifiedFetch(options))
            .catch((error) => {
                verifiedFetch = undefined;
                throw error;
            });
    }
    return verifiedFetch;
}

export async function readHeliaFile(cid: string, timeout: number): Promise<Buffer> {
    const signal = AbortSignal.timeout(timeout);
    let rejectAbort: (reason: unknown) => void;
    const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
    const onAbort = () => rejectAbort(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    try {
        const read = async () => {
            const fetch = await getHeliaReader();
            signal.throwIfAborted();
            const response = await fetch(`ipfs://${cid}`, { signal });
            if (!response.ok) {
                throw new CustomError(`IPFS Helia request failed (${response.status})`, response.status);
            }
            return Buffer.from(await response.arrayBuffer());
        };
        return await Promise.race([read(), aborted]);
    } finally {
        signal.removeEventListener('abort', onAbort);
    }
}
