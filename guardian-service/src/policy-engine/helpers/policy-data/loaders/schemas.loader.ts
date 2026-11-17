import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { Schema } from '@guardian/common/entity/schema';
import { PolicyDataLoader } from './loader.js';

/**
 * Schemas loader
 */
export class SchemasLoader extends PolicyDataLoader<Schema> {
    async get() {
        return await DatabaseServer.getSchemas({
            topicId: this.policyTopicId,
        });
    }
}
