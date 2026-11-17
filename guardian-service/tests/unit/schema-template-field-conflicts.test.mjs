import assert from 'node:assert/strict';
import {
    buildFieldChangeDetails,
    buildSchemaTemplateUpdatePreviewFromContext,
    buildTemplateSchemasSnapshot,
    preparePolicySchemaUpdate,
} from '../../dist/api/schema-template.service.js';
import { SchemaHelper } from '../../../interfaces/dist/helpers/schema-helper.js';

const KEEP = 'KEEP_CUSTOM_CHANGES';
const RESET = 'RESET_TO_TEMPLATE';
const MODIFIED = 'FIELD_MODIFIED_IN_POLICY';
const REMOVED = 'FIELD_REMOVED_IN_POLICY';

const field = (name, over = {}) => ({
    name, title: name, description: name, type: 'string', required: false,
    isArray: false, isRef: false, readOnly: false, templateFieldId: `tpl-${name}`, ...over,
});
const baseSchema = () => ({ uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' });

const buildDoc = (fields, conditions = []) => {
    const document = SchemaHelper.buildDocument(baseSchema(), fields, conditions);
    return document;
};
const stripEnvelope = (document) => {
    delete document.properties['@context'];
    delete document.properties.type;
    delete document.properties.id;
    return document;
};
const asSchema = (document, over = {}) => ({
    document, name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
    templateSchemaId: 'tsid-1', id: 'schema-1', ...over,
});

/**
 * previousFields: what the policy was applied from. nextFields: the new template version.
 * policyFields: what the policy holds now. unlocked: names of fields the template leaves editable.
 */
const buildContext = ({ previousFields, nextFields, policyFields, unlocked = [], nextConditions = [], previousConditions = nextConditions, policyConditions = nextConditions }) => {
    const previousSchema = asSchema(buildDoc(previousFields, previousConditions));
    const nextSchema = asSchema(buildDoc(nextFields, nextConditions));
    const fieldsConfig = Object.fromEntries(unlocked.map((name) => [`tpl-${name}`, { locked: false }]));
    const config = { schemas: { 'tsid-1': { fields: fieldsConfig } } };
    return {
        policy: { id: 'policy-1' },
        binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
        snapshot: { schemas: buildTemplateSchemasSnapshot([previousSchema]), config },
        nextSchemas: buildTemplateSchemasSnapshot([nextSchema]),
        template: { id: 'template-1', name: 'T', version: '1.0.1', config },
        templateSchemas: [nextSchema],
        policySchemaByTemplateId: new Map([['tsid-1', asSchema(stripEnvelope(buildDoc(policyFields, policyConditions)))]]),
    };
};

const conflictsOf = (context, type) =>
    buildSchemaTemplateUpdatePreviewFromContext(context).conflicts.filter((c) => c.type === type);

describe('schema template update: conflicts on policy-side field edits and deletions', () => {
    it('raises a modified conflict, with a policy-vs-template diff, for an edited unlocked field', () => {
        const context = buildContext({
            previousFields: [field('a')],
            nextFields: [field('a')],
            policyFields: [field('a', { type: 'number' })],
            unlocked: ['a'],
        });
        const [conflict] = conflictsOf(context, MODIFIED);

        assert.ok(conflict, 'the edit would be reverted by the update, so the user must be asked');
        assert.deepEqual(conflict.allowedActions, [KEEP, RESET]);
        const type = conflict.details.find((d) => d.label === 'Type');
        assert.deepEqual([type.before, type.after], ['Number', 'String'], 'before is the policy, after is the template');
    });

    it('does not raise a conflict for a locked field: the template is meant to win', () => {
        const context = buildContext({
            previousFields: [field('a')],
            nextFields: [field('a')],
            policyFields: [field('a', { type: 'number' })],
            unlocked: [],
        });
        assert.equal(conflictsOf(context, MODIFIED).length, 0);
    });

    it('does not raise a conflict when the policy field was never edited', () => {
        const context = buildContext({
            previousFields: [field('a')],
            nextFields: [field('a', { type: 'number' })],
            policyFields: [field('a')],
            unlocked: ['a'],
        });
        assert.equal(conflictsOf(context, MODIFIED).length, 0,
            'a plain template change over an untouched field is not a conflict');
    });

    it('does not raise a conflict when the policy edit already matches the new template', () => {
        const context = buildContext({
            previousFields: [field('a')],
            nextFields: [field('a', { type: 'number' })],
            policyFields: [field('a', { type: 'number' })],
            unlocked: ['a'],
        });
        assert.equal(conflictsOf(context, MODIFIED).length, 0);
    });

    it('raises a removed conflict for an unlocked field deleted in the policy', () => {
        const context = buildContext({
            previousFields: [field('a'), field('b')],
            nextFields: [field('a'), field('b')],
            policyFields: [field('a')],
            unlocked: ['b'],
        });
        const [conflict] = conflictsOf(context, REMOVED);

        assert.ok(conflict);
        assert.equal(conflict.fieldName, 'b');
        assert.deepEqual(conflict.allowedActions, [KEEP, RESET]);
    });

    it('does not raise a removed conflict for a locked field', () => {
        const context = buildContext({
            previousFields: [field('a'), field('b')],
            nextFields: [field('a'), field('b')],
            policyFields: [field('a')],
            unlocked: [],
        });
        assert.equal(conflictsOf(context, REMOVED).length, 0);
    });

    it('does not raise a removed conflict when the template itself dropped the field', () => {
        const context = buildContext({
            previousFields: [field('a'), field('b')],
            nextFields: [field('a')],
            policyFields: [field('a')],
            unlocked: ['b'],
        });
        assert.equal(conflictsOf(context, REMOVED).length, 0, 'nothing would be brought back');
    });

    it('withdraws "keep deleted" when a template condition triggers off the deleted field', () => {
        const trigger = field('trigger');
        const shown = field('shown');
        const context = buildContext({
            previousFields: [trigger, shown],
            nextFields: [trigger, shown],
            nextConditions: [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [shown], elseFields: [] }],
            policyFields: [],
            unlocked: ['trigger'],
        });
        const [conflict] = conflictsOf(context, REMOVED);

        assert.ok(conflict, 'still reported, so the user sees what comes back');
        assert.deepEqual(conflict.allowedActions, [RESET],
            'keeping it deleted would leave the condition pointing at nothing');
    });
});

describe('preparePolicySchemaUpdate: applying the chosen resolution', () => {
    const run = ({ previousFields, nextFields, policyFields, unlocked, action }) => {
        const context = buildContext({ previousFields, nextFields, policyFields, unlocked });
        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);
        const resolutions = new Map(preview.conflicts.map((c) => [c.id, action]));
        const target = context.policySchemaByTemplateId.get('tsid-1');
        const source = asSchema(buildDoc(nextFields));
        preparePolicySchemaUpdate(
            target, source, 'template-1',
            { customFieldsLocked: false, schemaSettingsLocked: false, fields: Object.fromEntries(unlocked.map((n) => [`tpl-${n}`, { locked: false }])) },
            preview.conflicts, resolutions,
            context.snapshot.schemas.schemas['tsid-1']
        );
        return { target, preview };
    };

    it('keeps the policy edit and its required flag when the user keeps custom changes', () => {
        const { target, preview } = run({
            previousFields: [field('a')],
            nextFields: [field('a')],
            policyFields: [field('a', { type: 'number', required: true })],
            unlocked: ['a'],
            action: KEEP,
        });
        assert.equal(preview.conflicts.length, 1);
        assert.equal(target.document.properties.a.type, 'number');
        assert.ok(target.document.required.includes('a'));
    });

    it('takes the template version when the user resets to the template', () => {
        const { target } = run({
            previousFields: [field('a')],
            nextFields: [field('a')],
            policyFields: [field('a', { type: 'number', required: true })],
            unlocked: ['a'],
            action: RESET,
        });
        assert.equal(target.document.properties.a.type, 'string');
        assert.equal(target.document.required.includes('a'), false);
    });

    it('leaves a deleted field out when the user keeps custom changes', () => {
        const { target } = run({
            previousFields: [field('a'), field('b')],
            nextFields: [field('a'), field('b')],
            policyFields: [field('a')],
            unlocked: ['b'],
            action: KEEP,
        });
        assert.ok(target.document.properties.a);
        assert.equal(target.document.properties.b, undefined);
    });

    it('brings a deleted field back when the user resets to the template', () => {
        const { target } = run({
            previousFields: [field('a'), field('b')],
            nextFields: [field('a'), field('b')],
            policyFields: [field('a')],
            unlocked: ['b'],
            action: RESET,
        });
        assert.ok(target.document.properties.b);
    });

    it('only touches the fields the user chose to keep', () => {
        const { target } = run({
            previousFields: [field('a'), field('b')],
            nextFields: [field('a'), field('b', { type: 'number' })],
            policyFields: [field('a', { type: 'number' }), field('b', { type: 'boolean' })],
            unlocked: ['a', 'b'],
            action: KEEP,
        });
        assert.equal(target.document.properties.a.type, 'number');
        assert.equal(target.document.properties.b.type, 'boolean');
    });
});

describe('fields inside a condition branch behave like any other field', () => {
    const trigger = () => field('trigger');
    const branch = (over = {}) => field('shown', over);
    const cond = (shown) => [{ ifCondition: { field: trigger(), fieldValue: 'yes' }, thenFields: [shown], elseFields: [] }];

    const run = ({ policyShown, action }) => {
        const nextConditions = cond(branch());
        const policyConditions = policyShown ? cond(policyShown) : [];
        const policyFields = policyShown ? [trigger(), policyShown] : [trigger()];
        const base = { previousFields: [trigger(), branch()], nextFields: [trigger(), branch()], nextConditions, policyFields, policyConditions, unlocked: ['shown'] };
        const context = buildContext(base);
        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);
        const resolutions = new Map(preview.conflicts.map((c) => [c.id, action]));
        const target = context.policySchemaByTemplateId.get('tsid-1');
        const source = asSchema(buildDoc(base.nextFields, nextConditions));
        preparePolicySchemaUpdate(
            target, source, 'template-1',
            { customFieldsLocked: false, schemaSettingsLocked: false, fields: { 'tpl-shown': { locked: false } } },
            preview.conflicts, resolutions, context.snapshot.schemas.schemas['tsid-1']
        );
        return { target, preview };
    };
    const thenProps = (target) => target.document.allOf[0].then.properties;

    it('raises a modified conflict for an edited branch field', () => {
        const { preview } = run({ policyShown: branch({ type: 'number' }), action: KEEP });
        assert.equal(preview.conflicts.filter((c) => c.type === MODIFIED).length, 1);
    });

    it('keeps an edited branch field inside its branch', () => {
        const { target } = run({ policyShown: branch({ type: 'number' }), action: KEEP });
        assert.equal(thenProps(target).shown.type, 'number');
        // The document declares a branch field in the root properties as well as the branch;
        // both copies must carry the policy's version or they would disagree.
        assert.equal(target.document.properties.shown.type, 'number');
    });

    it('resets an edited branch field to the template version', () => {
        const { target } = run({ policyShown: branch({ type: 'number' }), action: RESET });
        assert.equal(thenProps(target).shown.type, 'string');
    });

    it('raises a removed conflict for a branch field deleted in the policy, and honours keep', () => {
        const kept = run({ policyShown: null, action: KEEP });
        assert.equal(kept.preview.conflicts.filter((c) => c.type === REMOVED).length, 1);
        assert.equal(thenProps(kept.target)?.shown, undefined);

        const reset = run({ policyShown: null, action: RESET });
        assert.ok(thenProps(reset.target).shown, 'reset brings it back into the branch');
    });
});

describe('field type labels in the diff match the schema editor', () => {
    const typeDetail = (previous, next) =>
        buildFieldChangeDetails(previous, next).find((d) => d.label === 'Type');
    const base = { name: 'f', title: 'f', description: 'f', required: false, isArray: false, isRef: false };

    it('shows Help Text for a null type and the specific name for a string format', () => {
        const help = typeDetail({ ...base, type: 'null' }, { ...base, type: 'string' });
        assert.deepEqual([help.before, help.after], ['Help Text', 'String']);
        const date = typeDetail({ ...base, type: 'string' }, { ...base, type: 'string', format: 'date' });
        assert.deepEqual([date.before, date.after], ['String', 'Date']);
    });

    it('tells an enum, a prefix unit and a sub-schema apart from a plain string or number', () => {
        const enumChange = typeDetail({ ...base, type: 'string' }, { ...base, type: 'string', customType: 'enum' });
        assert.equal(enumChange.after, 'Enum');
        const unit = typeDetail({ ...base, type: 'number' }, { ...base, type: 'number', unitSystem: 'prefix' });
        assert.equal(unit.after, 'Prefix');
    });
});

describe('structured field data for the UI badges', () => {
    it('describes a deleted field by type label, required and array, not by raw type', () => {
        const context = buildContext({
            previousFields: [field('a'), field('help', { type: 'null' })],
            nextFields: [field('a'), field('help', { type: 'null' })],
            policyFields: [field('a')],
            unlocked: ['help'],
        });
        const [conflict] = conflictsOf(context, REMOVED);

        assert.deepEqual(conflict.templateField, { key: 'help', title: 'help', type: 'Help Text', required: false, isArray: false, hidden: false, autocalculate: false });
    });

    it('flags hidden and auto-calculated fields', () => {
        const context = buildContext({
            previousFields: [field('a')],
            nextFields: [field('a'), field('n', { hidden: true, autocalculate: true })],
            policyFields: [field('a')],
        });
        const added = buildSchemaTemplateUpdatePreviewFromContext(context).changes.find((c) => c.type === 'FIELD_ADD');

        assert.equal(added.afterField.hidden, true);
        assert.equal(added.afterField.autocalculate, true);
    });

    it('gives an edited field conflict the template field, key included', () => {
        const context = buildContext({
            previousFields: [field('a')],
            nextFields: [field('a')],
            policyFields: [field('a', { type: 'number' })],
            unlocked: ['a'],
        });
        const [conflict] = conflictsOf(context, MODIFIED);

        assert.equal(conflict.templateField.key, 'a');
        assert.equal(conflict.templateField.type, 'String');
    });

    it('carries the field for an added field too', () => {
        const context = buildContext({
            previousFields: [field('a')],
            nextFields: [field('a'), field('n', { type: 'number', required: true, isArray: true })],
            policyFields: [field('a')],
        });
        const added = buildSchemaTemplateUpdatePreviewFromContext(context).changes.find((c) => c.type === 'FIELD_ADD');

        assert.deepEqual(added.afterField, { key: 'n', title: 'n', type: 'Number', required: true, isArray: true, hidden: false, autocalculate: false });
    });
});
