import { KmlCoordinateScanner } from './kml-coordinate-scanner';
import { KmzReader } from './kmz-reader';

function uint16(value: number): number[] {
    return [value & 255, (value >>> 8) & 255];
}

function uint32(value: number): number[] {
    return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
}

function rawDeflate(bytes: Uint8Array): Uint8Array {
    const output: number[] = [];
    let offset = 0;
    while (offset < bytes.length || bytes.length === 0) {
        const size = Math.min(0xffff, bytes.length - offset);
        const final = offset + size >= bytes.length;
        output.push(final ? 1 : 0, ...uint16(size), ...uint16((~size) & 0xffff));
        output.push(...bytes.subarray(offset, offset + size));
        offset += size;
        if (final) break;
    }
    return new Uint8Array(output);
}

interface ZipInput {
    name: string;
    text: string;
    method?: number;
    flags?: number;
    declaredSize?: number;
    localExtra?: Uint8Array;
}

function zip(inputs: ZipInput[], zip64 = false): Blob {
    const encoder = new TextEncoder();
    const local: number[] = [];
    const central: number[] = [];
    for (const input of inputs) {
        const name = encoder.encode(input.name);
        const plain = encoder.encode(input.text);
        const method = input.method ?? 0;
        const flags = input.flags ?? 0;
        const compressed = method === 8 ? rawDeflate(plain) : plain;
        const extra = input.localExtra || new Uint8Array();
        const localOffset = local.length;
        local.push(
            ...uint32(0x04034b50), ...uint16(20), ...uint16(flags), ...uint16(method),
            ...uint16(0), ...uint16(0), ...uint32(0), ...uint32(compressed.length),
            ...uint32(input.declaredSize ?? plain.length), ...uint16(name.length), ...uint16(extra.length),
            ...name, ...extra, ...compressed
        );
        if (flags & 8) {
            local.push(...uint32(0x08074b50), ...uint32(0), ...uint32(compressed.length), ...uint32(plain.length));
        }
        central.push(
            ...uint32(0x02014b50), ...uint16(20), ...uint16(20), ...uint16(flags), ...uint16(method),
            ...uint16(0), ...uint16(0), ...uint32(0), ...uint32(compressed.length),
            ...uint32(input.declaredSize ?? plain.length), ...uint16(name.length), ...uint16(0),
            ...uint16(0), ...uint16(0), ...uint16(0), ...uint32(0), ...uint32(localOffset), ...name
        );
    }
    const count = zip64 ? 0xffff : inputs.length;
    const directoryOffset = local.length;
    const end = [
        ...uint32(0x06054b50), ...uint16(0), ...uint16(0), ...uint16(count), ...uint16(count),
        ...uint32(zip64 ? 0xffffffff : central.length),
        ...uint32(zip64 ? 0xffffffff : directoryOffset), ...uint16(0)
    ];
    return new Blob([new Uint8Array([...local, ...central, ...end])]);
}

describe('KmzReader', () => {
    const point = '<kml><Placemark><Point><coordinates>12,34</coordinates></Point></Placemark></kml>';
    let reader: KmzReader;

    beforeEach(() => reader = new KmzReader());

    it('selects doc.kml before another root KML', async () => {
        const archive = zip([
            { name: 'first.kml', text: point.replace('12,34', '1,2') },
            { name: 'doc.kml', text: point }
        ]);
        const inspection = await reader.inspect(archive);
        expect(inspection.entry.name).toBe('doc.kml');
        expect(await reader.readText(archive, inspection.entry, 1000)).toBe(point);
    });

    it('uses the first root KML when doc.kml is absent', async () => {
        const archive = zip([
            { name: 'folder/ignored.kml', text: point },
            { name: 'first.KML', text: point }
        ]);
        expect((await reader.inspect(archive)).entry.name).toBe('first.KML');
    });

    it('reads a stored entry without DecompressionStream', async () => {
        const saved = globalThis.DecompressionStream;
        (globalThis as any).DecompressionStream = undefined;
        try {
            const archive = zip([{ name: 'doc.kml', text: point }]);
            const inspection = await reader.inspect(archive);
            expect(await reader.readText(archive, inspection.entry, 1000)).toBe(point);
        } finally {
            (globalThis as any).DecompressionStream = saved;
        }
    });

    it('inflates a raw-deflate entry and reads its coordinate', async () => {
        const archive = zip([{ name: 'doc.kml', text: point, method: 8 }]);
        const inspection = await reader.inspect(archive);
        const coordinate = await reader.readCoordinate(
            archive, inspection.entry, new KmlCoordinateScanner(), 1000
        );
        expect(coordinate).toEqual([12, 34]);
    });

    it('uses central sizes when a data descriptor follows the data', async () => {
        const archive = zip([{ name: 'doc.kml', text: point, flags: 8 }]);
        const inspection = await reader.inspect(archive);
        expect(await reader.readText(archive, inspection.entry, 1000)).toBe(point);
    });

    it('uses local name and extra lengths to find the entry data', async () => {
        const archive = zip([{
            name: 'doc.kml', text: point, localExtra: new Uint8Array([1, 2, 3, 4])
        }]);
        const inspection = await reader.inspect(archive);
        expect(await reader.readText(archive, inspection.entry, 1000)).toBe(point);
    });

    it('stops when actual output exceeds the declared size', async () => {
        const archive = zip([{ name: 'doc.kml', text: point, method: 8, declaredSize: 4 }]);
        const inspection = await reader.inspect(archive);
        await expectAsync(reader.readText(archive, inspection.entry, 1000))
            .toBeRejectedWithError('The uncompressed KML size is invalid.');
    });

    it('rejects a missing root KML', async () => {
        await expectAsync(reader.inspect(zip([{ name: 'folder/doc.kml', text: point }])))
            .toBeRejectedWithError('The KMZ file does not contain a root KML file.');
    });

    it('rejects ZIP64 sentinels', async () => {
        await expectAsync(reader.inspect(zip([{ name: 'doc.kml', text: point }], true)))
            .toBeRejectedWithError('ZIP64 KMZ files are not supported.');
    });

    it('rejects encrypted and unknown-method entries', async () => {
        await expectAsync(reader.inspect(zip([{ name: 'doc.kml', text: point, flags: 1 }])))
            .toBeRejectedWithError('Encrypted KMZ entries are not supported.');
        await expectAsync(reader.inspect(zip([{ name: 'doc.kml', text: point, method: 12 }])))
            .toBeRejectedWithError('The KMZ compression method is not supported.');
    });

    it('rejects missing and truncated directory records', async () => {
        await expectAsync(reader.inspect(new Blob([new Uint8Array(22)])))
            .toBeRejectedWithError('The KMZ central directory is missing.');
        const valid = zip([{ name: 'doc.kml', text: point }]);
        await expectAsync(reader.inspect(valid.slice(0, valid.size - 3)))
            .toBeRejected();
    });

    it('returns the browser error when deflate-raw construction throws', async () => {
        const archive = zip([{ name: 'doc.kml', text: point, method: 8 }]);
        const inspection = await reader.inspect(archive);
        const saved = globalThis.DecompressionStream;
        (globalThis as any).DecompressionStream = class { constructor() { throw new Error('unsupported'); } };
        try {
            await expectAsync(reader.readText(archive, inspection.entry, 1000))
                .toBeRejectedWithError('This browser cannot open KMZ files.');
        } finally {
            (globalThis as any).DecompressionStream = saved;
        }
    });

    it('returns the browser error when DecompressionStream is missing', async () => {
        const archive = zip([{ name: 'doc.kml', text: point, method: 8 }]);
        const inspection = await reader.inspect(archive);
        const saved = globalThis.DecompressionStream;
        (globalThis as any).DecompressionStream = undefined;
        try {
            await expectAsync(reader.readText(archive, inspection.entry, 1000))
                .toBeRejectedWithError('This browser cannot open KMZ files.');
        } finally {
            (globalThis as any).DecompressionStream = saved;
        }
    });
});
