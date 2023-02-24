import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.9.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.changeDocumentStateFormat();
    }

    /**
     * Change document state format
     */
    async changeDocumentStateFormat() {
        const stateCollection = this.getCollection('DocumentState');
        const states = stateCollection.find({}, { session: this.ctx });
        while (await states.hasNext()) {
            const state = await states.next();
            await stateCollection.updateOne(
                { _id: state._id },
                {
                    $set: {
                        'document.option.status': state.status,
                        'document.option.comment': [state.reason],
                    },
                },
                { session: this.ctx, upsert: false }
            );
        }
        await stateCollection.updateMany(
            {},
            {
                $unset: {
                    reason: '',
                    status: ''
                },
            },
            { session: this.ctx, upsert: false }
        );
    }
}
