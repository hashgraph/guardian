import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.4.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.getCollection('VcDocument').updateMany({}, { $rename: { assign: 'assignedTo'} }, { session: this.ctx });
        await this.getCollection('DryRun').updateMany({}, { $rename: { assign: 'assignedTo'} }, { session: this.ctx });
        await this.getCollection('AggregateVC').updateMany({}, { $rename: { assign: 'assignedTo'} }, { session: this.ctx });
    }
}