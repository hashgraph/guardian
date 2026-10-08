import { DataBaseHelper, DatabaseServer, getGeospatialLimits, PinoLogger } from '@guardian/common';
import JSZip from 'jszip';
import { Readable } from 'node:stream';

interface GeoFileLink {
    fileId?: string;
    name?: string;
    format?: string;
    noPreview?: boolean;
}

interface LocatedLink {
    link: GeoFileLink;
    path: string;
}

interface GridFileAccess {
    stat(fileId: string): Promise<{ length: number }>;
    readPrefix(fileId: string, length: number): Promise<Buffer>;
    readAll(fileId: string): Promise<Buffer>;
}

type ValidatorLogger = Pick<PinoLogger, 'info' | 'error'>;

class GeospatialValidationError extends Error {}

async function readStream(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
}

const gridFileAccess: GridFileAccess = {
    async stat(fileId: string): Promise<{ length: number }> {
        const id = DatabaseServer.dbID(fileId);
        if (!id) throw new Error('Invalid file id');
        const files = await DataBaseHelper.gridFS.find(id).toArray();
        if (files.length === 0) throw new Error('Missing file');
        return { length: files[0].length };
    },
    async readPrefix(fileId: string, length: number): Promise<Buffer> {
        const id = DatabaseServer.dbID(fileId);
        if (!id) throw new Error('Invalid file id');
        return readStream(DataBaseHelper.gridFS.openDownloadStream(id, { end: length }));
    },
    async readAll(fileId: string): Promise<Buffer> {
        const file = await DatabaseServer.getGridFile(fileId);
        if (!Buffer.isBuffer(file?.buffer)) throw new Error('Unreadable file');
        return file.buffer;
    }
};

export class GeospatialFileValidator {
    public static async validateDocument(root: unknown, userId: string | null = null): Promise<void> {
        await new GeospatialFileValidator().validate(root, userId);
    }

    constructor(
        private readonly logger: ValidatorLogger = new PinoLogger(),
        private readonly files: GridFileAccess = gridFileAccess,
        private readonly maximumBytes: number = getGeospatialLimits().geospatialMaxFileSizeMb * 1024 * 1024
    ) {}

    public async validate(root: unknown, userId: string | null = null): Promise<void> {
        for (const located of this.collect(root)) {
            await this.validateLink(located, userId);
        }
    }

    private async validateLink(located: LocatedLink, userId: string | null): Promise<void> {
        const { link, path } = located;
        const fileId = link.fileId?.trim();
        if (!fileId) {
            await this.fail(link, path, 'The geospatial file link has no fileId.', userId);
        }
        let length: number;
        try {
            length = (await this.files.stat(fileId)).length;
        } catch {
            await this.fail(
                link,
                path,
                `The geospatial file ${this.fileName(link)} was not found.`,
                userId
            );
        }
        if (length === 0) {
            await this.fail(link, path, `The geospatial file ${this.fileName(link)} is empty.`, userId, 0);
        }
        if (length > this.maximumBytes) {
            await this.limitFailure(link, path, length, userId);
        }
        let prefix: Buffer;
        try {
            prefix = await this.files.readPrefix(fileId, Math.min(4, length));
        } catch {
            await this.fail(
                link,
                path,
                `The geospatial file ${this.fileName(link)} could not be read.`,
                userId,
                length
            );
        }
        const zip = prefix.length >= 4 &&
            prefix[0] === 0x50 && prefix[1] === 0x4b && prefix[2] === 0x03 && prefix[3] === 0x04;
        if (zip) {
            let buffer: Buffer;
            try {
                buffer = await this.files.readAll(fileId);
            } catch {
                await this.fail(
                    link,
                    path,
                    `The geospatial file ${this.fileName(link)} could not be read.`,
                    userId,
                    length
                );
            }
            await this.validateKmz(link, path, buffer, userId);
        }
        if (zip !== (link.format === 'kmz')) {
            await this.fail(
                link,
                path,
                `The geospatial file ${this.fileName(link)} format does not match its content.`,
                userId,
                length
            );
        }
        if (!zip && link.format !== 'geojson' && link.format !== 'kml') {
            await this.fail(
                link,
                path,
                `The geospatial file ${this.fileName(link)} has an unsupported format.`,
                userId,
                length
            );
        }
        if (link.noPreview === true) {
            await this.safeInfo(
                `Geospatial file accepted without preview: field=${path}, name=${this.fileName(link)}, format=${link.format}, size=${length}, limit=${this.maximumBytes}`,
                userId
            );
        }
    }

    private async validateKmz(
        link: GeoFileLink,
        path: string,
        buffer: Buffer,
        userId: string | null
    ): Promise<void> {
        try {
            const archive = await JSZip.loadAsync(buffer);
            const files = Object.values(archive.files);
            const entry = archive.file('doc.kml') || files.find(file =>
                !file.dir && !file.name.includes('/') && file.name.toLowerCase().endsWith('.kml')
            );
            if (!entry) {
                await this.fail(
                    link,
                    path,
                    `The KMZ file ${this.fileName(link)} does not contain a root KML file.`,
                    userId,
                    buffer.length
                );
            }
            let size = 0;
            const stream = new Readable({ read() {} });
            stream.wrap(entry.nodeStream('nodebuffer'));
            for await (const chunk of stream) {
                size += chunk.length;
                if (size > this.maximumBytes) {
                    await this.limitFailure(link, path, size, userId);
                }
            }
        } catch (error) {
            if (error instanceof GeospatialValidationError) throw error;
            await this.fail(
                link,
                path,
                `The KMZ file ${this.fileName(link)} could not be read.`,
                userId,
                buffer.length
            );
        }
    }

    private collect(root: unknown): LocatedLink[] {
        const result: LocatedLink[] = [];
        const seen = new Set<object>();
        const walk = (value: unknown, path: string): void => {
            if (!value || typeof value !== 'object' || seen.has(value as object)) return;
            seen.add(value as object);
            if (Array.isArray(value)) {
                value.forEach((item, index) => walk(item, `${path}[${index}]`));
                return;
            }
            const record = value as Record<string, unknown>;
            const candidate = record.geoFile;
            if (candidate && typeof candidate === 'object' && !Array.isArray(candidate) &&
                !seen.has(candidate as object)) {
                seen.add(candidate as object);
                result.push({ link: candidate as GeoFileLink, path });
            }
            for (const [key, child] of Object.entries(record)) {
                if (key !== 'geoFile') walk(child, path === '$' ? `$.${key}` : `${path}.${key}`);
            }
        };
        walk(root, '$');
        return result;
    }

    private async limitFailure(
        link: GeoFileLink,
        path: string,
        size: number,
        userId: string | null
    ): Promise<never> {
        return this.fail(
            link,
            path,
            `The geospatial file ${this.fileName(link)} at ${path} has size ${size} bytes, which exceeds the ${this.maximumBytes} byte limit.`,
            userId,
            size
        );
    }

    private async fail(
        link: GeoFileLink,
        path: string,
        message: string,
        userId: string | null,
        size?: number
    ): Promise<never> {
        await this.safeError(
            `${message} field=${path}, name=${this.fileName(link)}, format=${link.format || 'unknown'}, size=${size ?? 'unknown'}, limit=${this.maximumBytes}`,
            userId
        );
        throw new GeospatialValidationError(message);
    }

    private fileName(link: GeoFileLink): string {
        return link.name?.trim() || link.fileId?.trim() || 'unknown';
    }

    private async safeInfo(message: string, userId: string | null): Promise<void> {
        try {
            await this.logger.info(message, ['POLICY_SERVICE', 'GEOSPATIAL_FILE'], userId);
        } catch {}
    }

    private async safeError(message: string, userId: string | null): Promise<void> {
        try {
            await this.logger.error(message, ['POLICY_SERVICE', 'GEOSPATIAL_FILE'], userId);
        } catch {}
    }
}
