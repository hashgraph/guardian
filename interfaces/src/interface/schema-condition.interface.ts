import { SchemaField } from './schema-field.interface.js';

/**
 * A cross-schema condition target: a field that lives inside a nested sub-schema
 * and is controlled by a parent schema's condition (not defined at the parent level).
 * fieldPath is the full path from the parent schema root to the leaf field,
 * e.g. ['fieldC_ref', 'NumberC'].
 */
export interface SchemaConditionTarget {
  field: SchemaField;
  fieldPath: string[];
}

/**
 * Schema condition
 */
export interface SchemaCondition {
  ifCondition: (
    SchemaFieldPredicate |
    { AND: SchemaFieldPredicate[] } |
    { OR: SchemaFieldPredicate[] }
  );
  thenFields: SchemaField[];
  elseFields: SchemaField[];
  thenTargets?: SchemaConditionTarget[];
  elseTargets?: SchemaConditionTarget[];
  errors?: any[];
}

export interface SchemaFieldPredicate {
  field: SchemaField;
  fieldValue: any;
  fieldPath?: string[];
}
