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

/**
 * How a predicate's value is compared against the field's actual value.
 * Absent means 'equals' - existing schemas need no migration.
 */
export type SchemaPredicateComparator = 'equals' | 'contains' | 'every';

export interface SchemaFieldPredicate {
  field: SchemaField;
  fieldValue: any;
  fieldPath?: string[];
  comparator?: SchemaPredicateComparator;
}
