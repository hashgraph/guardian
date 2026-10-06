import { assert } from 'chai';
import { SheetName } from '../../../dist/xlsx/models/sheet-name.js';

describe('SheetName.getSheetName', () => {
    it('returns the sanitized name when first-seen', () => {
        const sn = new SheetName();
        assert.equal(sn.getSheetName('Schema A', 30), 'Schema A');
    });

    it('strips Excel-forbidden characters * ? : \\ / [ ]', () => {
        const sn = new SheetName();
        assert.equal(sn.getSheetName('a*?:[\\/]b', 30), 'ab');
    });

    it('truncates to size or 30, whichever is smaller', () => {
        const sn = new SheetName();
        const long = 'X'.repeat(60);
        const out = sn.getSheetName(long, 10);
        assert.equal(out.length, 10);
    });

    it('caps truncation at 30 even when caller passes a larger size', () => {
        const sn = new SheetName();
        const long = 'Y'.repeat(60);
        const out = sn.getSheetName(long, 60);
        assert.equal(out.length, 30);
    });

    it('returns "blank" when input becomes empty after sanitization (first call)', () => {
        assert.equal(new SheetName().getSheetName('', 30), 'blank');
        assert.equal(new SheetName().getSheetName('***', 30), 'blank');
    });

    it('appends a numeric suffix on collision (case-insensitive dedup; uses current call casing)', () => {
        const sn = new SheetName();
        sn.getSheetName('Foo', 30);
        const second = sn.getSheetName('foo', 30);
        // Dedup compares lowercased; the suffix uses the *current* call's casing
        assert.match(second, /^foo\s2$/);
    });

    it('keeps incrementing the suffix across further collisions', () => {
        const sn = new SheetName();
        sn.getSheetName('Bar', 30);
        sn.getSheetName('Bar', 30); // -> "Bar 2"
        const third = sn.getSheetName('Bar', 30);
        assert.match(third, /^Bar\s3$/);
    });
});

describe('SheetName.getSchemaName / getToolName / getEnumName', () => {
    it('schema name is constrained to 30 chars and reuses dedup logic', () => {
        const sn = new SheetName();
        const a = sn.getSchemaName('My Schema');
        const b = sn.getSchemaName('My Schema');
        assert.equal(a, 'My Schema');
        assert.match(b, /^My Schema\s2$/);
    });

    it('tool name is suffixed with " (tool)"', () => {
        const sn = new SheetName();
        assert.equal(sn.getToolName('MyTool'), 'MyTool (tool)');
    });

    it('enum name is suffixed with " (enum)"', () => {
        const sn = new SheetName();
        assert.equal(sn.getEnumName('Status'), 'Status (enum)');
    });
});
