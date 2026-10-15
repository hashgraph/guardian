import { Migration } from '@mikro-orm/migrations-mongodb';

export class ProjectCoordinatesMigration extends Migration {
    async up(): Promise<void> {
        const collection = this.getCollection('project_coordinates');
        await collection.createIndex(
            { coordinates: 1, projectId: 1 },
            { unique: true, name: 'project_coordinates_per_document' }
        );
        for (const index of await collection.indexes()) {
            if (index.name && index.unique && index.key.coordinates === 1 &&
                Object.keys(index.key).length === 1) {
                await collection.dropIndex(index.name);
            }
        }
        await collection.deleteMany({});
    }
}
