type VerifiedFetch = Awaited<ReturnType<typeof import('@helia/verified-fetch').createVerifiedFetch>>;

let verifiedFetch: Promise<VerifiedFetch> | undefined;

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

export async function readHeliaFile(cid: string): Promise<Buffer> {
    const signal = AbortSignal.timeout(parseInt(process.env.IPFS_TIMEOUT, 10) * 1000 || 120000);
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
                throw new Error(`IPFS Helia request failed (${response.status})`);
            }
            return Buffer.from(await response.arrayBuffer());
        };
        return await Promise.race([read(), aborted]);
    } finally {
        signal.removeEventListener('abort', onAbort);
    }
}
