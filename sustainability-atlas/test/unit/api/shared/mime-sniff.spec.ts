import { describe, expect, it } from '@jest/globals';
import { sniffMime } from '@shared/utils/mime-sniff';

// A real (1x1 transparent pixel) PNG — file-type reads past the raw signature
// into the IHDR chunk, so a truncated/fake signature isn't enough.
const PNG_BUFFER = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
);

describe('sniffMime — binary formats (magic bytes)', () => {
    it('detects a PNG', async () => {
        expect(await sniffMime(PNG_BUFFER)).toEqual({ mime: 'image/png', ext: 'png' });
    });

    it('detects a ZIP', async () => {
        const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
        expect(await sniffMime(zip)).toEqual({ mime: 'application/zip', ext: 'zip' });
    });

    it('falls back to octet-stream with no extension for unrecognized binary', async () => {
        const binary = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x00, 0x7f, 0x03]);
        expect(await sniffMime(binary)).toEqual({ mime: 'application/octet-stream', ext: null });
    });
});

describe('sniffMime — text formats (no magic bytes)', () => {
    it('detects a JSON object', async () => {
        const json = Buffer.from('{"credentialSubject":{"id":"did:hedera:testnet:abc"},"type":["VerifiableCredential"]}');
        expect(await sniffMime(json)).toEqual({ mime: 'application/json', ext: 'json' });
    });

    it('detects a JSON array', async () => {
        const json = Buffer.from('[\n  {"a": 1},\n  {"b": 2}\n]\n');
        expect(await sniffMime(json)).toEqual({ mime: 'application/json', ext: 'json' });
    });

    it('detects an HTML document', async () => {
        const html = Buffer.from('<!DOCTYPE html>\n<html>\n<body><h1>Report</h1></body>\n</html>\n');
        expect(await sniffMime(html)).toEqual({ mime: 'text/html', ext: 'html' });
    });

    it('detects an XML document', async () => {
        const xml = Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<root><item>1</item></root>');
        expect(await sniffMime(xml)).toEqual({ mime: 'application/xml', ext: 'xml' });
    });

    it('detects a CSV with a header row', async () => {
        const csv = Buffer.from('project,country,credits\nAlpha,Kenya,1200\nBeta,Peru,3400\n');
        expect(await sniffMime(csv)).toEqual({ mime: 'text/csv', ext: 'csv' });
    });

    it('detects a tab-separated file', async () => {
        const tsv = Buffer.from('project\tcountry\tcredits\nAlpha\tKenya\t1200\nBeta\tPeru\t3400\n');
        expect(await sniffMime(tsv)).toEqual({ mime: 'text/tab-separated-values', ext: 'tsv' });
    });

    it('treats plain prose as text', async () => {
        const txt = Buffer.from('This project was validated in 2024.\nNo further action is required.\n');
        expect(await sniffMime(txt)).toEqual({ mime: 'text/plain', ext: 'txt' });
    });

    it('does not mistake a single comma-containing sentence for CSV', async () => {
        const txt = Buffer.from('Credits were issued, retired, and later transferred.');
        expect(await sniffMime(txt)).toEqual({ mime: 'text/plain', ext: 'txt' });
    });

    it('does not mistake malformed JSON for JSON', async () => {
        const notJson = Buffer.from('{this is not valid json at all');
        expect(await sniffMime(notJson)).toEqual({ mime: 'text/plain', ext: 'txt' });
    });

    it('ignores delimiters inside quoted CSV fields when checking consistency', async () => {
        const csv = Buffer.from('name,note\n"Alpha, Ltd",ok\n"Beta, Inc",ok\n');
        expect(await sniffMime(csv)).toEqual({ mime: 'text/csv', ext: 'csv' });
    });
});
