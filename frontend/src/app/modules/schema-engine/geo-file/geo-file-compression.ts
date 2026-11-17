export async function isGzipBlob(blob: Blob): Promise<boolean> {
    const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
    return head.length === 2 && head[0] === 0x1f && head[1] === 0x8b;
}

export function gzipBlob(blob: Blob): Promise<Blob> {
    return new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob();
}

export async function gunzipIfCompressed(blob: Blob): Promise<Blob> {
    if (!(await isGzipBlob(blob))) return blob;
    return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).blob();
}
