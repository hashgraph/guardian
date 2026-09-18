import assert from 'node:assert/strict';
import { PolicyEditableField, PolicyEditableFieldDTO } from '../dist/helpers/policy-editable-field.js';

describe('PolicyEditableField defaults', () => {
    it('initialises scalar fields to empty/false', () => {
        const field = new PolicyEditableField();
        assert.equal(field.blockType, '');
        assert.equal(field.blockTag, '');
        assert.equal(field.propertyPath, '');
        assert.equal(field.label, '');
        assert.equal(field.shortDescription, '');
        assert.equal(field.required, false);
    });

    it('initialises collection fields to independent empty arrays', () => {
        const a = new PolicyEditableField();
        const b = new PolicyEditableField();
        assert.deepEqual(a.visible, []);
        assert.deepEqual(a.applyTo, []);
        assert.deepEqual(a.blocks, []);
        assert.deepEqual(a.properties, []);
        assert.deepEqual(a.roles, []);
        assert.deepEqual(a.targets, []);
        a.visible.push('x');
        assert.deepEqual(b.visible, []);
    });
});

describe('PolicyEditableField.fromDTO', () => {
    it('copies every DTO property onto a new instance', () => {
        const dto = new PolicyEditableFieldDTO();
        dto.blockType = 'requestVcDocumentBlock';
        dto.blockTag = 'tag-1';
        dto.propertyPath = 'options.title';
        dto.visible = ['OWNER'];
        dto.applyTo = ['All'];
        dto.label = 'Title';
        dto.required = true;
        dto.shortDescription = 'desc';

        const field = PolicyEditableField.fromDTO(dto);
        assert.ok(field instanceof PolicyEditableField);
        assert.equal(field.blockType, 'requestVcDocumentBlock');
        assert.equal(field.blockTag, 'tag-1');
        assert.equal(field.propertyPath, 'options.title');
        assert.deepEqual(field.visible, ['OWNER']);
        assert.deepEqual(field.applyTo, ['All']);
        assert.equal(field.label, 'Title');
        assert.equal(field.required, true);
        assert.equal(field.shortDescription, 'desc');
    });

    it('keeps instance-only defaults for properties absent from the DTO', () => {
        const field = PolicyEditableField.fromDTO(new PolicyEditableFieldDTO());
        assert.deepEqual(field.blocks, []);
        assert.deepEqual(field.roles, []);
        assert.deepEqual(field.targets, []);
        assert.deepEqual(field.properties, []);
    });
});

describe('PolicyEditableField.toDTO', () => {
    it('projects the editable subset into a DTO', () => {
        const field = new PolicyEditableField();
        field.blockType = 'bt';
        field.blockTag = 'tg';
        field.propertyPath = 'p';
        field.visible = ['A'];
        field.applyTo = ['B'];
        field.label = 'L';
        field.required = true;
        field.shortDescription = 'sd';

        const dto = field.toDTO();
        assert.ok(dto instanceof PolicyEditableFieldDTO);
        assert.equal(dto.blockType, 'bt');
        assert.equal(dto.blockTag, 'tg');
        assert.equal(dto.propertyPath, 'p');
        assert.deepEqual(dto.visible, ['A']);
        assert.deepEqual(dto.applyTo, ['B']);
        assert.equal(dto.label, 'L');
        assert.equal(dto.required, true);
        assert.equal(dto.shortDescription, 'sd');
    });

    it('does not carry view-only collections onto the DTO', () => {
        const field = new PolicyEditableField();
        field.blocks = [{ tag: 'x' }];
        field.roles = ['OWNER'];
        const dto = field.toDTO();
        assert.equal(dto.blocks, undefined);
        assert.equal(dto.roles, undefined);
    });

    it('round-trips DTO -> field -> DTO preserving editable values', () => {
        const src = new PolicyEditableFieldDTO();
        src.blockType = 'bt';
        src.blockTag = 'tg';
        src.propertyPath = 'pp';
        src.visible = ['OWNER', 'USER'];
        src.applyTo = ['All'];
        src.label = 'lbl';
        src.required = false;
        src.shortDescription = 'sd';

        const out = PolicyEditableField.fromDTO(src).toDTO();
        assert.deepEqual(out, src);
    });
});
