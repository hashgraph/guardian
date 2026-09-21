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
 * Absent means 'equals' - one universal default for every field, array or scalar alike.
 *
 * 'equals' against an array-typed field means "each element equals" (its array analogue).
 * There is deliberately no absent-vs-explicit carve-out for pre-existing schemas: an
 * array-field '=' predicate saved before this comparator existed means exactly the same thing
 * as one authored today.
 */
export type SchemaPredicateComparator = 'equals' | 'contains';

export interface SchemaFieldPredicate {
  field: SchemaField;
  fieldValue: any;
  fieldPath?: string[];
  comparator?: SchemaPredicateComparator;
}
