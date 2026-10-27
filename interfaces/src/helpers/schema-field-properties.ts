import { SchemaField } from '../interface/schema-field.interface.js';

/**
 * Where a field property lives: XLSX column and editor label.
 * A null side needs a reason in `exempt`.
 */
export interface ISchemaFieldPropertySpec {
    xlsx: string | null;
    editor: string | null;
    exempt?: string;
}

const RUNTIME = 'Runtime or derived value';
const VIA_TYPE = 'Derived from the field type';

/**
 * Every SchemaField key must be registered (Record type), so a new property
 * cannot be added without deciding its editor and XLSX behavior.
 */
export const SCHEMA_FIELD_PROPERTIES: Record<keyof SchemaField, ISchemaFieldPropertySpec> = {
    name: { xlsx: 'Key', editor: 'Key' },
    title: { xlsx: null, editor: 'Title', exempt: 'XLSX derives the title from the Description column path' },
    description: { xlsx: 'Description', editor: 'Description' },
    required: { xlsx: 'Required Field', editor: 'Required / Visibility' },
    hidden: { xlsx: 'Visibility', editor: 'Required / Visibility' },
    autocalculate: { xlsx: 'Visibility', editor: 'Required / Visibility' },
    expression: { xlsx: 'Parameter', editor: 'Expression' },
    isArray: { xlsx: 'Allow Multiple Answers', editor: 'Allow multiple answers' },
    isUpdatable: { xlsx: 'Updatable Field', editor: 'Updatable field' },
    isPrivate: { xlsx: 'Private Field', editor: 'Private field' },
    property: { xlsx: 'IWA Property', editor: 'IWA Property' },
    default: { xlsx: 'Default Value', editor: 'Values' },
    suggest: { xlsx: 'Suggest Value', editor: 'Values' },
    examples: { xlsx: 'Test Value', editor: 'Values' },
    type: { xlsx: 'Type', editor: 'Type' },
    format: { xlsx: 'Type', editor: 'Type' },
    customType: { xlsx: 'Type', editor: 'Type' },
    isRef: { xlsx: 'Type', editor: 'Type' },
    pattern: { xlsx: 'Parameter', editor: 'Pattern' },
    unit: { xlsx: 'Parameter', editor: 'Unit' },
    unitSystem: { xlsx: 'Type', editor: 'Unit' },
    enumName: { xlsx: 'Parameter', editor: 'Enum name' },
    enum: { xlsx: 'Parameter', editor: 'Enum values' },
    remoteLink: { xlsx: 'Parameter', editor: 'Enum values' },
    tableColumns: { xlsx: 'Parameter', editor: 'Table columns' },
    dependency: { xlsx: 'Parameter', editor: 'Depends on' },
    availableOptions: { xlsx: null, editor: 'GeoJSON types', exempt: 'Not supported by the XLSX format' },
    font: { xlsx: 'Parameter', editor: 'Text style' },
    textSize: { xlsx: 'Parameter', editor: 'Text style' },
    textColor: { xlsx: 'Parameter', editor: 'Text style' },
    textBold: { xlsx: 'Parameter', editor: 'Text style' },
    fields: { xlsx: 'Sub-Schema', editor: 'Type' },
    conditions: { xlsx: 'Visibility', editor: 'Conditions' },
    readOnly: { xlsx: null, editor: null, exempt: 'System fields only (policyId, ref, guardianVersion)' },
    comment: { xlsx: null, editor: null, exempt: RUNTIME },
    templateFieldId: { xlsx: null, editor: null, exempt: 'Schema template identity, not authored' },
    context: { xlsx: null, editor: null, exempt: RUNTIME },
    path: { xlsx: null, editor: null, exempt: RUNTIME },
    fullPath: { xlsx: null, editor: null, exempt: RUNTIME },
    conditionUserOrdered: { xlsx: null, editor: null, exempt: RUNTIME },
    order: { xlsx: null, editor: null, exempt: 'XLSX uses the row position' },
    errors: { xlsx: null, editor: null, exempt: RUNTIME },
    formulae: { xlsx: null, editor: null, exempt: 'Managed by the Formulas feature' },
    fullType: { xlsx: null, editor: null, exempt: VIA_TYPE },
    arrayLvl: { xlsx: null, editor: null, exempt: RUNTIME },
};
