import { CoordinateScanner, GeoCoordinate } from './first-coordinate-reader';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_LENGTH = 22;
const MAX_COMMENT_LENGTH = 0xffff;
const ZIP64_16 = 0xffff;
const ZIP64_32 = 0xffffffff;
const BROWSER_ERROR = 'This browser cannot open KMZ files.';

export interface KmzEntry {
    name: string;
    flags: number;
    compressionMethod: 0 | 8;
    compressedSize: number;
    uncompressedSize: number;
    localHeaderOffset: number;
}

export interface KmzInspection {
    entry: KmzEntry;
    previewSizeBytes: number;
}

interface EndRecord {
    entries: number;
    directorySize: number;
    directoryOffset: number;
    absoluteOffset: number;
}

export class KmzReader {
    public async inspect(file: Blob): Promise<KmzInspection> {
        const end = await this.readEndRecord(file);
        const entries = await this.readCentralDirectory(file, end);
        const entry = entries.find(item => item.name === 'doc.kml') ||
            entries.find(item => !item.name.includes('/') && item.name.toLowerCase().endsWith('.kml'));
        if (!entry) {
            throw new Error('The KMZ file does not contain a root KML file.');
        }
        return { entry, previewSizeBytes: entry.uncompressedSize };
    }

    public async readText(file: Blob, entry: KmzEntry, maximumBytes: number): Promise<string> {
        const decoder = new TextDecoder('utf-8');
        let text = '';
        await this.readEntry(file, entry, maximumBytes, chunk => {
            text += decoder.decode(chunk, { stream: true });
            return false;
        });
        return text + decoder.decode();
    }

    public async readCoordinate(
        file: Blob,
        entry: KmzEntry,
        scanner: CoordinateScanner,
        maximumBytes: number
    ): Promise<GeoCoordinate | null> {
        const decoder = new TextDecoder('utf-8');
        const stopped = await this.readEntry(file, entry, maximumBytes, chunk => {
            scanner.write(decoder.decode(chunk, { stream: true }));
            return scanner.settled;
        });
        if (!stopped) {
            scanner.write(decoder.decode());
            scanner.finish();
        }
        return scanner.coordinate;
    }

    private async readEndRecord(file: Blob): Promise<EndRecord> {
        if (file.size < EOCD_LENGTH) throw new Error('The KMZ central directory is missing.');
        const length = Math.min(file.size, MAX_COMMENT_LENGTH + EOCD_LENGTH);
        const start = file.size - length;
        const bytes = new Uint8Array(await file.slice(start).arrayBuffer());
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        let offset = -1;
        for (let index = bytes.length - EOCD_LENGTH; index >= 0; index -= 1) {
            if (view.getUint32(index, true) === EOCD_SIGNATURE &&
                index + EOCD_LENGTH + view.getUint16(index + 20, true) === bytes.length) {
                offset = index;
                break;
            }
        }
        if (offset < 0) throw new Error('The KMZ central directory is missing.');
        const disk = view.getUint16(offset + 4, true);
        const directoryDisk = view.getUint16(offset + 6, true);
        const diskEntries = view.getUint16(offset + 8, true);
        const entries = view.getUint16(offset + 10, true);
        const directorySize = view.getUint32(offset + 12, true);
        const directoryOffset = view.getUint32(offset + 16, true);
        if (disk !== 0 || directoryDisk !== 0 || diskEntries !== entries) {
            throw new Error('Multi-disk KMZ files are not supported.');
        }
        if (entries === ZIP64_16 || directorySize === ZIP64_32 || directoryOffset === ZIP64_32) {
            throw new Error('ZIP64 KMZ files are not supported.');
        }
        const absoluteOffset = start + offset;
        if (directoryOffset + directorySize > absoluteOffset) {
            throw new Error('The KMZ central directory is invalid.');
        }
        return { entries, directorySize, directoryOffset, absoluteOffset };
    }

    private async readCentralDirectory(file: Blob, end: EndRecord): Promise<KmzEntry[]> {
        const bytes = new Uint8Array(await file.slice(
            end.directoryOffset,
            end.directoryOffset + end.directorySize
        ).arrayBuffer());
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const decoder = new TextDecoder('utf-8');
        const entries: KmzEntry[] = [];
        let offset = 0;
        for (let index = 0; index < end.entries; index += 1) {
            if (offset + 46 > bytes.length || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) {
                throw new Error('The KMZ central directory is invalid.');
            }
            const flags = view.getUint16(offset + 8, true);
            const method = view.getUint16(offset + 10, true);
            const compressedSize = view.getUint32(offset + 20, true);
            const uncompressedSize = view.getUint32(offset + 24, true);
            const nameLength = view.getUint16(offset + 28, true);
            const extraLength = view.getUint16(offset + 30, true);
            const commentLength = view.getUint16(offset + 32, true);
            const disk = view.getUint16(offset + 34, true);
            const localHeaderOffset = view.getUint32(offset + 42, true);
            const next = offset + 46 + nameLength + extraLength + commentLength;
            if (next > bytes.length) throw new Error('The KMZ central directory is invalid.');
            if (flags & 1) throw new Error('Encrypted KMZ entries are not supported.');
            if (method !== 0 && method !== 8) throw new Error('The KMZ compression method is not supported.');
            if (disk !== 0 || compressedSize === ZIP64_32 ||
                uncompressedSize === ZIP64_32 || localHeaderOffset === ZIP64_32) {
                throw new Error('ZIP64 KMZ files are not supported.');
            }
            const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
            entries.push({
                name,
                flags,
                compressionMethod: method,
                compressedSize,
                uncompressedSize,
                localHeaderOffset
            });
            offset = next;
        }
        if (offset !== bytes.length || entries.length !== end.entries) {
            throw new Error('The KMZ central directory is invalid.');
        }
        return entries;
    }

    private async readEntry(
        file: Blob,
        entry: KmzEntry,
        maximumBytes: number,
        consume: (chunk: Uint8Array) => boolean
    ): Promise<boolean> {
        const fixed = new Uint8Array(await file.slice(
            entry.localHeaderOffset,
            entry.localHeaderOffset + 30
        ).arrayBuffer());
        if (fixed.byteLength !== 30) throw new Error('The KMZ local header is truncated.');
        const view = new DataView(fixed.buffer, fixed.byteOffset, fixed.byteLength);
        if (view.getUint32(0, true) !== LOCAL_SIGNATURE) throw new Error('The KMZ local header is invalid.');
        const flags = view.getUint16(6, true);
        const method = view.getUint16(8, true);
        const nameLength = view.getUint16(26, true);
        const extraLength = view.getUint16(28, true);
        if ((flags & 1) || method !== entry.compressionMethod) {
            throw new Error('The KMZ local header does not match its directory entry.');
        }
        const dataStart = entry.localHeaderOffset + 30 + nameLength + extraLength;
        const dataEnd = dataStart + entry.compressedSize;
        if (dataStart < 0 || dataEnd > file.size || dataEnd < dataStart) {
            throw new Error('The KMZ entry range is invalid.');
        }
        let stream = file.slice(dataStart, dataEnd).stream() as ReadableStream<Uint8Array>;
        if (entry.compressionMethod === 8) stream = this.inflate(stream);
        const reader = stream.getReader();
        let outputSize = 0;
        try {
            while (true) {
                const result = await reader.read();
                if (result.done) return false;
                outputSize += result.value.byteLength;
                if (outputSize > maximumBytes || outputSize > entry.uncompressedSize) {
                    throw new Error('The uncompressed KML size is invalid.');
                }
                if (consume(result.value)) {
                    await reader.cancel();
                    return true;
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    private inflate(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
        const Constructor = globalThis.DecompressionStream;
        if (!Constructor) throw new Error(BROWSER_ERROR);
        try {
            const decompressor = new Constructor('deflate-raw');
            const input = stream.getReader();
            const output = decompressor.writable.getWriter();
            void (async () => {
                try {
                    while (true) {
                        const result = await input.read();
                        if (result.done) break;
                        const chunk = new Uint8Array(result.value.byteLength);
                        chunk.set(result.value);
                        await output.write(chunk);
                    }
                    await output.close();
                } catch (error) {
                    await output.abort(error);
                } finally {
                    input.releaseLock();
                    output.releaseLock();
                }
            })();
            return decompressor.readable;
        } catch {
            throw new Error(BROWSER_ERROR);
        }
    }
}
