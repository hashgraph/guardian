import { SchemaField } from './schema-field.interface.js';

/**
 * Schema condition
 */
export interface SchemaCondition {
  ifCondition: (
    { field: SchemaField; fieldValue: any } |
    { AND: SchemaFieldPredicate[] } |
    { OR: SchemaFieldPredicate[] }
  );
  thenFields: SchemaField[];
  elseFields: SchemaField[];
  errors?: any[];
}

export interface SchemaFieldPredicate {
  field: SchemaField;
  fieldValue: any;
}