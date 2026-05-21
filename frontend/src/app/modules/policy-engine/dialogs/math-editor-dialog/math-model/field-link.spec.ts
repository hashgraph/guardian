import { FieldLink } from './field-link';
import { MathItemType } from './math-item.type';

// ─── name validation ──────────────────────────────────────────────────────────
describe('FieldLink._update — name validation', () => {
    it('accepts a simple identifier', () => {
        const link = new FieldLink('myVar', 'doc.field');
        link.update();
        expect(link.validName).toBeTrue();
        expect(link.variableName).toBe('myVar');
    });

    it('accepts comma-subscript notation and normalises to underscore', () => {
        const link = new FieldLink('fNRB_y,i', 'doc.field');
        link.update();
        expect(link.validName).toBeTrue();
        expect(link.variableName).toBe('fNRB_y_i');
    });

    it('preserves original text in variableNameText after comma normalisation', () => {
        const link = new FieldLink('x,i,j', 'doc.field');
        link.update();
        expect(link.variableNameText).toBe('x,i,j');
        expect(link.variableName).toBe('x_i_j');
    });

    it('rejects name starting with a digit', () => {
        const link = new FieldLink('1foo', 'doc.field');
        link.update();
        expect(link.validName).toBeFalse();
    });

    it('rejects empty name', () => {
        const link = new FieldLink('', 'doc.field');
        link.update();
        expect(link.validName).toBeFalse();
    });

    it('rejects name with leading comma', () => {
        const link = new FieldLink(',x', 'doc.field');
        link.update();
        expect(link.validName).toBeFalse();
    });

    it('rejects name with trailing comma', () => {
        const link = new FieldLink('x,', 'doc.field');
        link.update();
        expect(link.validName).toBeFalse();
    });
});

// ─── toJson serialisation ─────────────────────────────────────────────────────
describe('FieldLink.toJson', () => {
    it('serialises type as LINK', () => {
        const link = new FieldLink('x', 'doc.field');
        link.update();
        expect(link.toJson().type).toBe(MathItemType.LINK);
    });

    it('name in JSON is variableNameText (original notation, not normalised)', () => {
        const link = new FieldLink('x,i', 'doc.field');
        link.update();
        expect(link.toJson().name).toBe('x,i');
    });

    it('includes field and schema', () => {
        const link = new FieldLink('x', 'doc.field');
        link.schema = 'schema#1';
        link.update();
        const json = link.toJson();
        expect(json.field).toBe('doc.field');
        expect(json.schema).toBe('schema#1');
    });
});

// ─── round-trip via FieldLink.from ────────────────────────────────────────────
describe('FieldLink.from — round-trip', () => {
    it('restores variableNameText from JSON name (comma notation)', () => {
        const original = new FieldLink('fNRB_y,i', 'doc.field');
        original.update();
        const restored = FieldLink.from(original.toJson())!;
        restored.update();
        expect(restored.variableNameText).toBe('fNRB_y,i');
        expect(restored.variableName).toBe('fNRB_y_i');
        expect(restored.validName).toBeTrue();
    });

    it('returns null for non-object input', () => {
        expect(FieldLink.from(null as any)).toBeNull();
        expect(FieldLink.from(undefined as any)).toBeNull();
    });
});
