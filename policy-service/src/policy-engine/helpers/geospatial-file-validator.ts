import { DataBaseHelper } from '@guardian/common/helpers/db-helper';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { getGeospatialLimits } from '@guardian/common/helpers/geospatial-limits';
import { PinoLogger } from '@guardian/common/helpers/pino-logger';
import { GeoJsonValidator, KmlWellFormedChecker, KmzReader, KmzSizeError, NetworkLinkFinder, polygonValueError, validateGeoJsonValue } from '@guardian/interfaces';
import { GeoJsonFeatureCounter, KmlFeatureCounter, GeoFileCounts } from './geo-file-counter.js';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';

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
    openStream(fileId: string): Readable;
}

type ValidatorLogger = Pick<PinoLogger, 'debug' | 'info' | 'warn' | 'error'>;

const GEOJSON_TYPES = new Set([
    'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon',
    'GeometryCollection', 'Feature', 'FeatureCollection'
]);

class GeospatialValidationError extends Error {}

async function readStream(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

const gridFileAccess: GridFileAccess = {
    async stat(fileId: string): Promise<{ length: number }> {
        const id = DatabaseServer.dbID(fileId);
        if (!id) {
            throw new Error('Invalid file id');
        }
        const files = await DataBaseHelper.gridFS.find(id).toArray();
        if (files.length === 0) {
            throw new Error('Missing file');
        }
        return { length: files[0].length };
    },
    async readPrefix(fileId: string, length: number): Promise<Buffer> {
        const id = DatabaseServer.dbID(fileId);
        if (!id) {
            throw new Error('Invalid file id');
        }
        return readStream(DataBaseHelper.gridFS.openDownloadStream(id, { end: length }));
    },
    async readAll(fileId: string): Promise<Buffer> {
        const file = await DatabaseServer.getGridFile(fileId);
        if (!Buffer.isBuffer(file?.buffer)) {
            throw new Error('Unreadable file');
        }
        return file.buffer;
    },
    openStream(fileId: string): Readable {
        const id = DatabaseServer.dbID(fileId);
        if (!id) {
            throw new Error('Invalid file id');
        }
        return DataBaseHelper.gridFS.openDownloadStream(id);
    }
};

class ContentInspection {
    public format: 'geojson' | 'kml' | null = null;
    private json = new GeoJsonValidator();
    private xml = new KmlWellFormedChecker();
    private links = new NetworkLinkFinder();
    private jsonCounter = new GeoJsonFeatureCounter(this.json);
    private kmlCounter = new KmlFeatureCounter();
    public write(text: string): void {
        if (!this.format) {
            const first = text.trimStart()[0];
            if (!first) return;
            this.format = first === '<' ? 'kml' : 'geojson';
        }
        if (this.format === 'geojson') { this.jsonCounter.write(text); }
        else { this.xml.write(text); this.links.write(text); this.kmlCounter.write(text); }
    }
    public finish(): { valid: boolean; reason?: string; links: number; counts: GeoFileCounts } {
        if (this.format === 'geojson') return { ...this.json.finish(), links: 0, counts: this.jsonCounter.finish() };
        return { valid: this.xml.finish(), links: this.links.finish(), counts: this.kmlCounter.finish() };
    }
}

export class GeospatialFileValidator {
    public static async validateDocument(root: unknown, userId: string | null = null, previous?: unknown): Promise<void> {
        await new GeospatialFileValidator().validate(root, userId, previous);
    }

    constructor(
        private readonly logger: ValidatorLogger = new PinoLogger(),
        private readonly files: GridFileAccess = gridFileAccess,
        private readonly maximumBytes: number = getGeospatialLimits().geospatialMaxFileSizeMb * 1024 * 1024
    ) {}

    public async validate(root: unknown, userId: string | null = null, previous?: unknown): Promise<void> {
        const values: { value: object; path: string; unchanged: boolean }[] = [];
        const seen = new Set<object>();
        const walk = (value: unknown, old: unknown, path: string): void => {
            if (!value || typeof value !== 'object' || seen.has(value)) return;
            seen.add(value);
            if (!Array.isArray(value) && this.isGeoJsonValue(value)) {
                let unchanged = false;
                try { unchanged = previous !== undefined && JSON.stringify(value) === JSON.stringify(old); } catch { unchanged = false; }
                values.push({ value, path, unchanged });
                return;
            }
            for (const [key, child] of Object.entries(value)) {
                const before = old && typeof old === 'object' ? Reflect.get(old, key) : undefined;
                walk(child, before, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`);
            }
        };
        walk(root, previous, '$');
        const policyId = root && typeof root === 'object' && typeof Reflect.get(root, 'policyId') === 'string'
            ? Reflect.get(root, 'policyId') || 'unknown' : 'unknown';
        const logs: { message: string; level: 'info' | 'debug' | 'warn' }[] = [];
        for (const located of this.collect(root)) {
            const unchanged = values.some(value => value.unchanged && (located.path === value.path || located.path.startsWith(value.path + '.')));
            logs.push(...await this.validateLink(located, userId, policyId, !unchanged));
        }
        for (const located of values) {
            if (located.unchanged) continue;
            const check = validateGeoJsonValue(located.value);
            if (!check.valid) {
                const reason = check.reason?.replace(/\$/g, () => located.path);
                await this.failValue(located.path, `The geospatial value at ${located.path} is not valid GeoJSON (RFC 7946): ${reason}`, userId);
            }
            const polygonError = polygonValueError(located.value);
            if (polygonError) await this.failValue(located.path, `The geospatial value at ${located.path} has an invalid polygon: ${polygonError}`, userId);
        }
        for (const log of logs) await this.safeLog(log.level, log.message, userId);
    }

    private async validateLink(located: LocatedLink, userId: string | null, policyId: string, checkContent: boolean): Promise<{ message: string; level: 'info' | 'debug' | 'warn' }[]> {
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
        let measured = length;
        const inspection = checkContent ? new ContentInspection() : undefined;
        const gzip = prefix.length >= 2 && prefix[0] === 0x1f && prefix[1] === 0x8b;
        if (gzip) {
            measured = await this.validateGzip(link, path, fileId, length, userId, inspection);
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
            measured = await this.validateKmz(link, path, buffer, userId, inspection);
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
        if (!gzip && !zip && inspection) {
            const decoder = new TextDecoder();
            try {
                for await (const chunk of this.files.openStream(fileId)) inspection.write(decoder.decode(chunk, { stream: true }));
                inspection.write(decoder.decode());
            } catch {
                await this.fail(link, path, `The geospatial file ${this.fileName(link)} could not be read.`, userId, length);
            }
        }
        const logs: { message: string; level: 'info' | 'debug' | 'warn' }[] = [];
        if (inspection) {
            const result = inspection.finish();
            const format = zip ? 'KMZ' : inspection.format?.toUpperCase();
            if (!zip && inspection.format && inspection.format !== link.format) {
                await this.fail(link, path, `The geospatial file ${this.fileName(link)} format does not match its content.`, userId, measured);
            }
            if (!result.valid) {
                const message = inspection.format === 'geojson'
                    ? `The geospatial file ${this.fileName(link)} is not valid GeoJSON (RFC 7946): ${result.reason}`
                    : `The geospatial file ${this.fileName(link)} could not be read.`;
                await this.fail(link, path, message, userId, measured);
            }
            const sizes = zip ? `${measured} bytes KML (${length} bytes archive)`
                : `${measured} bytes${gzip ? ` (${length} bytes compressed)` : ''}`;
            logs.push({ level: 'debug', message: `Geospatial file "${this.fileName(link)}" (${format}) in policy ${policyId} checked: ${result.counts.features} ${result.counts.features === 1 ? 'feature' : 'features'}, ${result.counts.vertices} ${result.counts.vertices === 1 ? 'vertex' : 'vertices'}, ${sizes}` });
            if (result.links) logs.push({ level: 'warn', message: `Geospatial file "${this.fileName(link)}" (${format}) in policy ${policyId} contains ${result.links} NetworkLink ${result.links === 1 ? 'element' : 'elements'}; linked content is not imported` });
        }
        if (link.noPreview === true) logs.push({ level: 'info', message: `Geospatial file "${this.fileName(link)}" (${link.format?.toUpperCase()}) in field ${path} was accepted without preview: ${measured} bytes, limit ${this.maximumBytes} bytes` });
        return logs;
    }

    private async validateGzip(
        link: GeoFileLink,
        path: string,
        fileId: string,
        length: number,
        userId: string | null,
        inspection?: ContentInspection
    ): Promise<number> {
        let size = 0;
        let head = Buffer.alloc(0);
        const decoder = new TextDecoder();
        try {
            const source = this.files.openStream(fileId);
            const gunzip = createGunzip();
            source.on('error', error => gunzip.destroy(error));
            try {
                for await (const chunk of source.pipe(gunzip)) {
                    size += chunk.length;
                    inspection?.write(decoder.decode(chunk, { stream: true }));
                    if (head.length < 4) {
                        head = Buffer.concat([head, chunk]).subarray(0, 4);
                    }
                    if (size > this.maximumBytes) {
                        await this.limitFailure(link, path, size, userId);
                    }
                }
            } finally {
                source.destroy();
            }
        } catch (error) {
            if (error instanceof GeospatialValidationError) {
                throw error;
            }
            await this.fail(
                link,
                path,
                `The geospatial file ${this.fileName(link)} could not be read.`,
                userId,
                length
            );
        }
        inspection?.write(decoder.decode());
        if (size === 0) {
            await this.fail(link, path, `The geospatial file ${this.fileName(link)} is empty.`, userId, 0);
        }
        const zip = head.length >= 4 &&
            head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
        if (zip || (link.format !== 'geojson' && link.format !== 'kml')) {
            await this.fail(
                link,
                path,
                `The geospatial file ${this.fileName(link)} format does not match its content.`,
                userId,
                size
            );
        }
        return size;
    }

    private async validateKmz(
        link: GeoFileLink, path: string, buffer: Buffer, userId: string | null,
        inspection?: ContentInspection
    ): Promise<number> {
        try {
            const reader = new KmzReader();
            const file = new Blob([new Uint8Array(buffer)]);
            const result = await reader.inspect(file);
            if (result.previewSizeBytes > this.maximumBytes) await this.limitFailure(link, path, result.previewSizeBytes, userId);
            await reader.readCoordinate(file, result.entry, {
                coordinate: null, settled: false,
                write(text) { inspection?.write(text); }, finish() {}
            }, this.maximumBytes);
            return result.previewSizeBytes;
        } catch (error) {
            if (error instanceof GeospatialValidationError) throw error;
            if (error instanceof KmzSizeError) await this.limitFailure(link, path, error.size, userId);
            if (error instanceof Error && error.message === 'The KMZ file does not contain a root KML file.') {
                await this.fail(link, path, `The KMZ file ${this.fileName(link)} does not contain a root KML file.`, userId, buffer.length);
            }
            await this.fail(link, path, `The KMZ file ${this.fileName(link)} could not be read.`, userId, buffer.length);
        }
    }

    private collect(root: unknown): LocatedLink[] {
        const result: LocatedLink[] = [];
        const seen = new Set<object>();
        const walk = (value: unknown, path: string): void => {
            if (!value || typeof value !== 'object' || seen.has(value as object)) {
                return;
            }
            seen.add(value as object);
            if (Array.isArray(value)) {
                value.forEach((item, index) => walk(item, `${path}[${index}]`));
                return;
            }
            const record = value as Record<string, unknown>;
            const linked = this.isGeoJsonValue(record) && record.geoFile !== undefined;
            if (linked) {
                const candidate = record.geoFile;
                const link: GeoFileLink = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
                    ? candidate as GeoFileLink
                    : {};
                if (!seen.has(link)) {
                    seen.add(link);
                    result.push({ link, path });
                }
            }
            for (const [key, child] of Object.entries(record)) {
                if (!linked || key !== 'geoFile') {
                    walk(child, path === '$' ? `$.${key}` : `${path}.${key}`);
                }
            }
        };
        walk(root, '$');
        return result;
    }

    private isGeoJsonValue(record: object): boolean {
        const type = Reflect.get(record, 'type');
        return typeof type === 'string' && GEOJSON_TYPES.has(type) &&
            ('coordinates' in record || 'geometry' in record || 'features' in record || 'geometries' in record);
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
            `The geospatial file ${this.fileName(link)} at ${path} exceeds the ${this.maximumBytes} byte limit.`,
            userId,
            size
        );
    }

    private async failValue(path: string, message: string, userId: string | null): Promise<never> {
        await this.safeError(`${message}${message.endsWith('.') ? '' : '.'} Field ${path}.`, userId);
        throw new GeospatialValidationError(message);
    }

    private async fail(
        link: GeoFileLink,
        path: string,
        message: string,
        userId: string | null,
        size?: number
    ): Promise<never> {
        await this.safeError(
            `${message} Field ${path}, file "${this.fileName(link)}" (${link.format || 'unknown'}), size ${size ?? 'unknown'}, limit ${this.maximumBytes}.`,
            userId
        );
        throw new GeospatialValidationError(message);
    }

    private fileName(link: GeoFileLink): string {
        return link.name?.trim() || link.fileId?.trim() || 'unknown';
    }

    private async safeLog(level: 'debug' | 'info' | 'warn', message: string, userId: string | null): Promise<void> {
        try { await this.logger[level](message, ['POLICY_SERVICE', 'GEOSPATIAL_FILE'], userId); } catch { return; }
    }

    private async safeError(message: string, userId: string | null): Promise<void> {
        try {
            await this.logger.error(message, ['POLICY_SERVICE', 'GEOSPATIAL_FILE'], userId);
        } catch {
            return;
        }
    }
}
