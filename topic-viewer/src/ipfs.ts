import type { Request, Response } from 'express';

export async function getIpfsFile(req: Request, res: Response): Promise<void> {
    try {
        const cid = encodeURIComponent(String(req.params.cid));
        const gateway = process.env.IPFS_PUBLIC_GATEWAY || 'http://localhost:8080/ipfs/{cid}';
        const response = await fetch(gateway.replace('${cid}', cid).replace('{cid}', cid), {
            signal: AbortSignal.timeout(120000),
        });
        if (response.status !== 200) {
            res.sendStatus(response.status);
            return;
        }
        res.type('application/octet-stream').send(Buffer.from(await response.arrayBuffer()));
    } catch {
        res.sendStatus(502);
    }
}
