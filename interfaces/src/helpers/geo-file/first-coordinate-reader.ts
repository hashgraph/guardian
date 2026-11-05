export type GeoCoordinate = [number, number] | [number, number, number];

export interface CoordinateScanner {
    readonly coordinate: GeoCoordinate | null;
    readonly settled: boolean;
    write(text: string): void;
    finish(): void;
}

export async function readFirstCoordinate(
    file: Blob,
    scanner: CoordinateScanner,
    chunkSize = 1024 * 1024
): Promise<GeoCoordinate | null> {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
        throw new Error('Chunk size must be a positive integer.');
    }
    const decoder = new TextDecoder('utf-8');
    let offset = 0;
    while (offset < file.size && !scanner.settled) {
        const end = Math.min(offset + Math.max(chunkSize, 1024 * 1024), file.size);
        const bytes = new Uint8Array(await file.slice(offset, end).arrayBuffer());
        for (let index = 0; index < bytes.length && !scanner.settled; index += chunkSize) {
            scanner.write(decoder.decode(bytes.subarray(index, index + chunkSize), { stream: true }));
        }
        offset = end;
        await Promise.resolve();
    }
    if (!scanner.settled) {
        scanner.write(decoder.decode());
        scanner.finish();
    }
    return scanner.coordinate;
}
