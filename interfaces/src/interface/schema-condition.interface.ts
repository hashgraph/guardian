import { SchemaField } from './schema-field.interface.js';

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
