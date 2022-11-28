import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * Migration to version 2.7.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.changeImageTypePattern();
    }

    /**
     * Change image type pattern
     */
    async changeImageTypePattern() {
        const policiesCollection = this.getCollection('Policy');
        const schemasCollection = this.getCollection('Schema');
        const policies = policiesCollection.find({}, { session: this.ctx });
        while (await policies.hasNext()) {
            const policy = await policies.next();
            if (policy && policy.status !== 'PUBLISH') {
                const schemas = schemasCollection.find({
                    topicId: policy.topicId,
                });
                while (await schemas.hasNext()) {
                    const schema = await schemas.next();
                    if (
                        schema &&
                        schema.status !== 'PUBLISH' &&
                        schema.document
                    ) {
                        const document = schema.document;
                        if (!document.properties) {
                            return document;
                        }
                        const fields = Object.keys(document.properties);
                        for (const field of fields) {
                            const properties = document.properties[field];
                            if (
                                properties.pattern ===
                                '^((https)://)?ipfs.io/ipfs/.+'
                            ) {
                                properties.pattern = '^ipfs://.+';
                            } else if (
                                properties.items &&
                                properties.items.pattern ===
                                    '^((https)://)?ipfs.io/ipfs/.+'
                            ) {
                                properties.items.pattern = '^ipfs://.+';
                            }
                        }
                        await schemasCollection.updateOne(
                            { _id: schema._id },
                            {
                                $set: {
                                    document,
                                },
                            },
                            { session: this.ctx, upsert: false }
                        );
                    }
                }
            }
        }
    }
}
