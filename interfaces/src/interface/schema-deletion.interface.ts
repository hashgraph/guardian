import { ISchema } from './schema.interface.js';

/**
 * Schema deletion preview
 */
export interface ISchemaDeletionPreview {
    // Child schemas that will be deleted
    deletableChildren: ISchema[];

    // Child schemas that cannot be deleted
    blockedChildren: IChildSchemaDeletionBlock[];
}

/**
 * Schema deletion block
 */
export interface IChildSchemaDeletionBlock {
    // Child schema that cannot be deleted
    schema: ISchema;

    // External schemas holding references that block deletion
    blockingSchemas: ISchema[];
}