import { deflateRawSync } from 'node:zlib';

export function kmz(text, { zip64 = false, method = 0, missingExtra = false, unsafeOffset = false } = {}) {
    const name = Buffer.from('doc.kml');
    const plain = Buffer.from(text);
    const data = method === 8 ? deflateRawSync(plain) : plain;
    const extra = Buffer.alloc(zip64 && !missingExtra ? 28 : 0);
    if (extra.length) {
        extra.writeUInt16LE(1, 0); extra.writeUInt16LE(24, 2);
        extra.writeBigUInt64LE(BigInt(plain.length), 4);
        extra.writeBigUInt64LE(BigInt(data.length), 12);
        extra.writeBigUInt64LE(unsafeOffset ? 2n ** 53n : 0n, 20);
    }
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(45, 4); local.writeUInt16LE(method, 8);
    local.writeUInt32LE(zip64 ? 0xffffffff : data.length, 18);
    local.writeUInt32LE(zip64 ? 0xffffffff : plain.length, 22);
    local.writeUInt16LE(name.length, 26); local.writeUInt16LE(extra.length, 28);
    const content = Buffer.concat([local, name, extra, data]);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(45, 6); central.writeUInt16LE(method, 10);
    central.writeUInt32LE(zip64 ? 0xffffffff : data.length, 20);
    central.writeUInt32LE(zip64 ? 0xffffffff : plain.length, 24);
    central.writeUInt16LE(name.length, 28); central.writeUInt16LE(extra.length, 30);
    central.writeUInt32LE(zip64 ? 0xffffffff : 0, 42);
    const directory = Buffer.concat([central, name, extra]);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50); end.writeUInt16LE(zip64 ? 0xffff : 1, 8); end.writeUInt16LE(zip64 ? 0xffff : 1, 10);
    end.writeUInt32LE(zip64 ? 0xffffffff : directory.length, 12);
    end.writeUInt32LE(zip64 ? 0xffffffff : content.length, 16);
    const records = [];
    if (zip64) {
        const record = Buffer.alloc(56);
        record.writeUInt32LE(0x06064b50); record.writeBigUInt64LE(44n, 4);
        record.writeBigUInt64LE(1n, 24); record.writeBigUInt64LE(1n, 32);
        record.writeBigUInt64LE(BigInt(directory.length), 40); record.writeBigUInt64LE(BigInt(content.length), 48);
        const locator = Buffer.alloc(20);
        locator.writeUInt32LE(0x07064b50); locator.writeBigUInt64LE(BigInt(content.length + directory.length), 8); locator.writeUInt32LE(1, 16);
        records.push(record, locator);
    }
    return Buffer.concat([content, directory, ...records, end]);
}
