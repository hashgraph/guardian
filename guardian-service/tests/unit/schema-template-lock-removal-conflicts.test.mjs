import assert from 'node:assert/strict';
import {
    buildSchemaTemplateUpdatePreviewFromContext,
    buildTemplateSchemasSnapshot,
    preparePolicySchemaUpdate,
} from '../../dist/api/schema-template.service.js';
import { SchemaHelper } from '../../../interfaces/dist/helpers/schema-helper.js';

const KEEP = 'KEEP_CUSTOM_CHANGES';
const RESET = 'RESET_TO_TEMPLATE';
const LOCK_CONFLICT = 'CUSTOM_FIELD_REMOVED_BY_LOCK';

const field = (name, over = {}) => ({
    name, title: name, description: name, type: 'string', required: false,
    isArray: false, isRef: false, readOnly: false, ...over,
});
const templateField = (name, over = {}) => field(name, { templateFieldId: `tpl-${name}`, ...over });
const customField = (name, over = {}) => field(name, over);

const baseSchema = () => ({ uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' });
const buildDoc = (fields, conditions = []) => SchemaHelper.buildDocument(baseSchema(), fields, conditions);
const stripEnvelope = (document) => {
    delete document.properties['@context'];
    delete document.properties.type;
    delete document.properties.id;
    return document;
};
const asSchema = (document) => ({
    document, name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
    templateSchemaId: 'tsid-1', id: 'schema-1',
});

const trigger = () => templateField('trigger');
const branch = () => templateField('shown');
const conditionsOf = (...thenFields) => [
    { ifCondition: { field: trigger(), fieldValue: 'yes' }, thenFields, elseFields: [] },
];

/**
 * The template locks nothing in the previous version (the snapshot) and `lock` in the next one,
 * the way a template author turns a lock on between two versions.
 */
const setup = ({ lock, templateFields, templateConditions = [], policyFields, policyConditions = [] }) => {
    const previousSchema = asSchema(buildDoc(templateFields, templateConditions));
    const nextSchema = asSchema(buildDoc(templateFields, templateConditions));
    const previousConfig = { schemas: { 'tsid-1': { fields: {} } } };
    const nextSchemaConfig = { fields: {}, ...lock };
    const nextConfig = { schemas: { 'tsid-1': nextSchemaConfig } };
    const context = {
        policy: { id: 'policy-1' },
        binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
        snapshot: { schemas: buildTemplateSchemasSnapshot([previousSchema]), config: previousConfig },
        nextSchemas: buildTemplateSchemasSnapshot([nextSchema]),
        template: { id: 'template-1', name: 'T', version: '1.0.1', config: nextConfig },
        templateSchemas: [nextSchema],
        policySchemaByTemplateId: new Map([
            ['tsid-1', asSchema(stripEnvelope(buildDoc(policyFields, policyConditions)))],
        ]),
    };
    const preview = buildSchemaTemplateUpdatePreviewFromContext(context);
    const apply = (action) => {
        const target = context.policySchemaByTemplateId.get('tsid-1');
        const source = asSchema(buildDoc(templateFields, templateConditions));
        const resolutions = new Map(preview.conflicts.map((c) => [c.id, action]));
        preparePolicySchemaUpdate(
            target, source, 'template-1', nextSchemaConfig,
            preview.conflicts, resolutions, context.snapshot.schemas.schemas['tsid-1']
        );
        return target.document;
    };
    return { preview, apply };
};

describe('schema template update: custom fields removed by a lock raise a conflict', () => {
    describe('customFieldsLocked', () => {
        const build = () => setup({
            lock: { customFieldsLocked: true },
            templateFields: [templateField('a')],
            policyFields: [templateField('a'), customField('extra')],
        });

        it('raises a keep/reset conflict for each custom field the lock removes', () => {
            const conflicts = build().preview.conflicts.filter((c) => c.type === LOCK_CONFLICT);
            assert.equal(conflicts.length, 1);
            assert.deepEqual(conflicts[0].allowedActions, [KEEP, RESET]);
            assert.equal(conflicts[0].fieldName, 'extra');
        });

        it('removes the field when the user resets', () => {
            assert.equal(build().apply(RESET).properties.extra, undefined);
        });

        it('keeps the field when the user keeps it', () => {
            const target = build().apply(KEEP);
            assert.ok(target.properties.extra);
            assert.ok(target.properties.a, 'the template field is untouched');
        });
    });

    describe('conditionsLocked', () => {
        const build = () => setup({
            lock: { conditionsLocked: true },
            templateFields: [trigger(), branch()],
            templateConditions: conditionsOf(branch()),
            policyFields: [trigger(), branch(), customField('extra')],
            policyConditions: conditionsOf(branch(), customField('extra')),
        });
        const thenProps = (target) => target.allOf[0].then.properties;

        it('raises a conflict for a custom field inside a surviving condition', () => {
            const conflicts = build().preview.conflicts.filter((c) => c.type === LOCK_CONFLICT);
            assert.deepEqual(conflicts.map((c) => c.fieldName), ['extra']);
        });

        it('removes it from the condition on reset', () => {
            const target = build().apply(RESET);
            assert.equal(target.properties.extra, undefined);
            assert.equal(thenProps(target).extra, undefined);
        });

        it('keeps it inside its branch on keep', () => {
            const target = build().apply(KEEP);
            assert.ok(thenProps(target).extra, 'still shown by the surviving condition');
            assert.ok(target.properties.extra);
        });
    });

    it('raises nothing when the template locks nothing', () => {
        const { preview } = setup({
            lock: {},
            templateFields: [templateField('a')],
            policyFields: [templateField('a'), customField('extra')],
        });
        assert.equal(preview.conflicts.filter((c) => c.type === LOCK_CONFLICT).length, 0);
    });
});
