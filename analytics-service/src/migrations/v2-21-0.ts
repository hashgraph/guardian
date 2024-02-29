import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.20.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.updateIndex();
    }

    /**
     * Remove vp hash index
     */
    async updateIndex() {
        const analyticsDocumentCollection = this.getCollection('AnalyticsDocument');
        try {
            if (await analyticsDocumentCollection.indexExists('uuid_1')) {
                await analyticsDocumentCollection.dropIndex('uuid_1');
            }
        } catch (error) {
            console.log(error);
        }

        const analyticsTokenCacheCollection = this.getCollection('AnalyticsTokenCache');
        try {
            if (await analyticsTokenCacheCollection.indexExists('tokenId_1')) {
                await analyticsTokenCacheCollection.dropIndex('tokenId_1');
            }
        } catch (error) {
            console.log(error);
        }

        const AnalyticsTopicCacheCollection = this.getCollection('AnalyticsTopicCache');
        try {
            if (await AnalyticsTopicCacheCollection.indexExists('topicId_1')) {
                await AnalyticsTopicCacheCollection.dropIndex('topicId_1');
            }
        } catch (error) {
            console.log(error);
        }
    }
}
