import { CoordinateScanner, GeoCoordinate } from './first-coordinate-reader.js';

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

export class KmzSizeError extends Error {
    constructor(public readonly size: number) { super('The uncompressed KML size is invalid.'); }
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
            return this.readZip64EndRecord(file, start + offset);
        }
        const absoluteOffset = start + offset;
        if (directoryOffset + directorySize > absoluteOffset) {
            throw new Error('The KMZ central directory is invalid.');
        }
        return { entries, directorySize, directoryOffset, absoluteOffset };
    }

    private safeInteger(view: DataView, offset: number): number {
        const value = view.getBigUint64(offset, true);
        if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('The KMZ central directory is invalid.');
        return Number(value);
    }

    private async readZip64EndRecord(file: Blob, classicOffset: number): Promise<EndRecord> {
        const invalid = () => new Error('The KMZ central directory is invalid.');
        if (classicOffset < 20) throw invalid();
        const locator = new DataView(await file.slice(classicOffset - 20, classicOffset).arrayBuffer());
        if (locator.byteLength !== 20 || locator.getUint32(0, true) !== 0x07064b50 ||
            locator.getUint32(4, true) !== 0 || locator.getUint32(16, true) !== 1) throw invalid();
        const absoluteOffset = this.safeInteger(locator, 8);
        if (absoluteOffset + 56 > classicOffset - 20) throw invalid();
        const record = new DataView(await file.slice(absoluteOffset, absoluteOffset + 56).arrayBuffer());
        if (record.byteLength !== 56 || record.getUint32(0, true) !== 0x06064b50 ||
            record.getUint32(16, true) !== 0 || record.getUint32(20, true) !== 0 ||
            this.safeInteger(record, 24) !== this.safeInteger(record, 32)) throw invalid();
        const entries = this.safeInteger(record, 32);
        const directorySize = this.safeInteger(record, 40);
        const directoryOffset = this.safeInteger(record, 48);
        if (directoryOffset + directorySize > absoluteOffset) throw invalid();
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
            let compressedSize = view.getUint32(offset + 20, true);
            let uncompressedSize = view.getUint32(offset + 24, true);
            const nameLength = view.getUint16(offset + 28, true);
            const extraLength = view.getUint16(offset + 30, true);
            const commentLength = view.getUint16(offset + 32, true);
            const disk = view.getUint16(offset + 34, true);
            let localHeaderOffset = view.getUint32(offset + 42, true);
            const next = offset + 46 + nameLength + extraLength + commentLength;
            if (next > bytes.length) throw new Error('The KMZ central directory is invalid.');
            if (flags & 1) throw new Error('Encrypted KMZ entries are not supported.');
            if (method !== 0 && method !== 8) throw new Error('The KMZ compression method is not supported.');
            if (disk !== 0 && disk !== ZIP64_16) throw new Error('Multi-disk KMZ files are not supported.');
            if (disk === ZIP64_16 || [compressedSize, uncompressedSize, localHeaderOffset].includes(ZIP64_32)) {
                let cursor = offset + 46 + nameLength;
                const limit = cursor + extraLength;
                let found = false;
                while (cursor + 4 <= limit) {
                    const id = view.getUint16(cursor, true);
                    const size = view.getUint16(cursor + 2, true);
                    cursor += 4;
                    if (cursor + size > limit) throw new Error('The KMZ central directory is invalid.');
                    if (id === 1) {
                        const read = () => {
                            if (cursor + 8 > limit || cursor + 8 > offset + 46 + nameLength + extraLength || size < 8) {
                                throw new Error('The KMZ central directory is invalid.');
                            }
                            const value = this.safeInteger(view, cursor);
                            cursor += 8;
                            return value;
                        };
                        const end = cursor + size;
                        if (uncompressedSize === ZIP64_32) uncompressedSize = read();
                        if (compressedSize === ZIP64_32) compressedSize = read();
                        if (localHeaderOffset === ZIP64_32) localHeaderOffset = read();
                        if (disk === ZIP64_16) {
                            if (cursor + 4 > end) throw new Error('The KMZ central directory is invalid.');
                            if (view.getUint32(cursor, true) !== 0) throw new Error('Multi-disk KMZ files are not supported.');
                            cursor += 4;
                        }
                        if (cursor > end) throw new Error('The KMZ central directory is invalid.');
                        found = true;
                        break;
                    }
                    cursor += size;
                }
                if (!found) throw new Error('The KMZ central directory is invalid.');
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
                if (result.done) {
                    if (outputSize !== entry.uncompressedSize) throw new Error('The uncompressed KML size is invalid.');
                    return false;
                }
                outputSize += result.value.byteLength;
                if (outputSize > maximumBytes) throw new KmzSizeError(outputSize);
                if (outputSize > entry.uncompressedSize) {
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
