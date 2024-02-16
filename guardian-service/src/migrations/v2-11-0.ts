import { Migration } from '@mikro-orm/migrations-mongodb';
import { GridFSBucket } from 'mongodb';

/**
 * Migration to version 2.11.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.renameDocumentStateColumn();
        await this.addDefsToSchemas();
    }

    /**
     * Rename document state column
     */
    async renameDocumentStateColumn() {
        const stateCollection = this.getCollection('DocumentState');
        await stateCollection.updateMany(
            {},
            {
                $rename: {
                    'created': 'createdOn'
                },
            },
            { session: this.ctx, upsert: false }
        );
    }

    /**
     * Add defs to schemas
     */
    async addDefsToSchemas() {
        const schemaCollection = this.getCollection('Schema');
        const schemas = schemaCollection.find({}, { session: this.ctx });
        const db: any = this.driver?.getConnection()?.getDb();
        const gridFS = new GridFSBucket(db);
        while (await schemas.hasNext()) {
            const schema = await schemas.next();
            let document = schema.document;
            if (schema.documentFileId) {
                const fileStream = gridFS.openDownloadStream(schema.documentFileId);
                const bufferArray = [];
                for await (const data of fileStream) {
                    bufferArray.push(data);
                }
                const buffer = Buffer.concat(bufferArray);
                document = JSON.parse(buffer.toString());
            }
            if (document?.$defs) {
                await schemaCollection.updateOne(
                    { _id: schema._id },
                    {
                        $set: {
                            'defs': Object.keys(document.$defs)
                        },
                    },
                    { session: this.ctx, upsert: false }
                );
            }
        }
    }
}
