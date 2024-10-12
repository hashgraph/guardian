import { DatabaseServer, Schema } from '@guardian/common';
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
