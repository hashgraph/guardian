import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.4.0
 */
export class v_2_4_0 extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.getCollection('Policy').updateMany({}, { $rename: { assign: 'assignee'} }, { session: this.ctx });
        await this.getCollection('DryRun').updateMany({}, { $rename: { assign: 'assignee'} }, { session: this.ctx });
        await this.getCollection('AggregateVC').updateMany({}, { $rename: { assign: 'assignee'} }, { session: this.ctx });
    }
}