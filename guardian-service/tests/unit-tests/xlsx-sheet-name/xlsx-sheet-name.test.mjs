import assert from 'node:assert/strict';
import { SheetName } from '../../../dist/xlsx/models/sheet-name.js';

describe('SheetName.getSheetName', () => {
    it('passes through a clean alphanumeric name within the size limit', () => {
        const s = new SheetName();
        assert.equal(s.getSheetName('Hello', 30), 'Hello');
    });

    it('truncates names that exceed the size limit', () => {
        const s = new SheetName();
        const truncated = s.getSheetName('A'.repeat(50), 10);
        assert.equal(truncated.length, 10);
    });

    it('caps size at 30 characters even for larger requested sizes', () => {
        const s = new SheetName();
        const truncated = s.getSheetName('A'.repeat(50), 999);
        assert.equal(truncated.length, 30);
    });

    it('strips Excel-illegal characters: * ? : \\ / [ ]', () => {
        const s = new SheetName();
        const out = s.getSheetName('a*b?c:d\\e/f[g]h', 30);
        assert.equal(out, 'abcdefgh');
    });

    it('returns "blank" when the cleaned name is empty', () => {
        const s = new SheetName();
        assert.equal(s.getSheetName('', 30), 'blank');
    });

    it('deduplicates "blank" with a numeric suffix on subsequent calls', () => {
        const s = new SheetName();
        s.getSheetName('', 30);
        assert.equal(s.getSheetName('***', 30), 'blank 2');
    });

    it('appends a number for duplicate names (case-insensitive)', () => {
        const s = new SheetName();
        const a = s.getSheetName('Hello', 30);
        const b = s.getSheetName('hello', 30);
        const c = s.getSheetName('HELLO', 30);
        assert.equal(a, 'Hello');
        assert.equal(b, 'hello 2');
        assert.equal(c, 'HELLO 3');
    });

    it('trims trailing whitespace before assigning', () => {
        const s = new SheetName();
        assert.equal(s.getSheetName('  Hello  ', 30), 'Hello');
    });
});

describe('SheetName.getSchemaName / getToolName / getEnumName', () => {
    it('getSchemaName uses size 30', () => {
        const s = new SheetName();
        const out = s.getSchemaName('A'.repeat(50));
        assert.equal(out.length, 30);
    });

    it('getToolName appends " (tool)" suffix', () => {
        const s = new SheetName();
        assert.equal(s.getToolName('Demo'), 'Demo (tool)');
    });

    it('getEnumName appends " (enum)" suffix', () => {
        const s = new SheetName();
        assert.equal(s.getEnumName('Demo'), 'Demo (enum)');
    });

    it('tool suffix prefix is truncated to 23 chars', () => {
        const s = new SheetName();
        const out = s.getToolName('A'.repeat(50));
        // A (23) + " (tool)" (7) = 30 chars total.
        assert.equal(out.length, 30);
        assert.ok(out.endsWith(' (tool)'));
    });
});
