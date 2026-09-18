import { fromBuffer } from 'file-type';

export interface SniffedType {
    mime: string;
    /** Filename extension without the dot, or null when the type is unknown. */
    ext: string | null;
}

const UNKNOWN: SniffedType = { mime: 'application/octet-stream', ext: null };

/** How many bytes to inspect when deciding whether a buffer is text at all. */
const TEXT_SAMPLE_BYTES = 8192;

/**
 * True when the buffer decodes as UTF-8 without NUL or stray control bytes.
 *
 * Binary formats `file-type` doesn't recognise must stay octet-stream rather
 * than being mislabelled as text, so this errs towards rejecting.
 */
function looksLikeText(buffer: Buffer): boolean {
    if (buffer.length === 0) return false;

    const sample = buffer.subarray(0, TEXT_SAMPLE_BYTES);
    for (const byte of sample) {
        // Allow tab (9), LF (10), CR (13), FF (12) — reject every other C0 control and NUL.
        if (byte === 0) return false;
        if (byte < 0x20 && byte !== 9 && byte !== 10 && byte !== 12 && byte !== 13) return false;
    }

    // A lossy decode substitutes U+FFFD for invalid sequences; its presence
    // means the bytes were not valid UTF-8 to begin with. Decode the whole
    // buffer only when the cheap byte scan has already passed.
    return !sample.toString('utf8').includes('�');
}

/** Counts the delimiter outside of double-quoted spans, so quoted commas don't inflate the count. */
function countUnquoted(line: string, delimiter: string): number {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === delimiter && !inQuotes) count++;
    }
    return count;
}

/**
 * True when the sampled lines look like delimiter-separated records: at least
 * two non-empty lines, each carrying the same non-zero number of delimiters.
 *
 * Requiring two consistent lines is what keeps a single sentence containing
 * commas classified as plain text.
 */
function looksLikeDelimited(text: string, delimiter: string): boolean {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '').slice(0, 10);
    if (lines.length < 2) return false;

    const first = countUnquoted(lines[0], delimiter);
    if (first < 1) return false;

    return lines.every(line => countUnquoted(line, delimiter) === first);
}

/**
 * Classifies text content that carries no magic bytes.
 *
 * Order matters: JSON is tested before the delimited checks because JSON
 * contains commas, and markup is tested before them for the same reason.
 */
function sniffTextType(buffer: Buffer): SniffedType {
    const text = buffer.toString('utf8');
    const trimmed = text.trim();
    if (trimmed === '') return { mime: 'text/plain', ext: 'txt' };

    // JSON — only objects and arrays. A bare number or quoted string parses as
    // valid JSON too, but as a whole file it is far likelier to be plain text.
    if (/^[[{]/.test(trimmed)) {
        try {
            JSON.parse(trimmed);
            return { mime: 'application/json', ext: 'json' };
        } catch {
            // Not JSON after all — keep classifying.
        }
    }

    const lowered = trimmed.slice(0, 1024).toLowerCase();
    if (lowered.startsWith('<!doctype html') || lowered.startsWith('<html') ||
        lowered.includes('<html') || lowered.includes('<body')) {
        return { mime: 'text/html', ext: 'html' };
    }

    if (lowered.startsWith('<?xml')) {
        return { mime: 'application/xml', ext: 'xml' };
    }

    if (looksLikeDelimited(text, ',')) return { mime: 'text/csv', ext: 'csv' };
    if (looksLikeDelimited(text, '\t')) return { mime: 'text/tab-separated-values', ext: 'tsv' };

    return { mime: 'text/plain', ext: 'txt' };
}

/**
 * Best-guess Content-Type and filename extension for a buffer of unknown
 * origin (e.g. raw IPFS content, which carries no Content-Type of its own).
 *
 * `file-type` handles anything with magic bytes (images, PDF, video, Office
 * documents, archives). Text formats — JSON, HTML, CSV, plain text — have no
 * magic bytes at all, so they fall through to a content-based sniffer rather
 * than being served as octet-stream with no extension.
 *
 * Pinned to file-type@16.5.4 — the last release published with CommonJS
 * support, matching this project's CommonJS build (17+ is ESM-only).
 */
export async function sniffMime(buffer: Buffer): Promise<SniffedType> {
    const detected = await fromBuffer(buffer);
    if (detected) {
        return { mime: detected.mime, ext: detected.ext };
    }

    return looksLikeText(buffer) ? sniffTextType(buffer) : UNKNOWN;
}
