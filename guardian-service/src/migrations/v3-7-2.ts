import { Migration } from '@mikro-orm/migrations-mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';
import { SchemaHelper } from '@guardian/interfaces';

/**
 * Migration to version 3.7.2
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.recomputeSchemaDefs();
    }

    /**
     * `Schema.defs` used to be the raw keys of `$defs`, which accumulate forever
     * and are never pruned (nothing removes an id once a reference to it is cut).
     * It's now computed via SchemaHelper.collectReachableRefs, which walks real
     * $ref/type pointers instead of trusting key membership, but that only runs
     * on save. Backfill every existing schema here so stale entries don't linger
     * until something happens to resave them.
     */
    async recomputeSchemaDefs() {
        const schemasCollection = this.getCollection('Schema');
        const db = this.driver.getConnection().getDb();
        const bucket = new GridFSBucket(db);

        const cursor = schemasCollection.find(
            { documentFileId: { $exists: true, $ne: null } },
            { session: this.ctx }
        );

        while (await cursor.hasNext()) {
            const schema = await cursor.next();
            try {
                const document = await this.loadDocument(bucket, schema.documentFileId);
                if (!document?.$defs) {
                    continue;
                }
                const defs = SchemaHelper.collectReachableRefs(document, schema.iri);
                if (!this.sameDefs(schema.defs, defs)) {
                    await schemasCollection.updateOne(
                        { _id: schema._id },
                        { $set: { defs } },
                        { session: this.ctx }
                    );
                }
            } catch {
                // Malformed/legacy document: leave this row's defs untouched rather
                // than aborting the whole backfill.
                continue;
            }
        }
    }

    /** Reads and parses a schema document stored in GridFS. */
    async loadDocument(bucket: GridFSBucket, fileId: ObjectId): Promise<any> {
        const stream = bucket.openDownloadStream(fileId);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return JSON.parse(Buffer.concat(chunks).toString());
    }

    /** Order-insensitive comparison so an unchanged set doesn't trigger a write. */
    sameDefs(oldDefs: string[] | undefined, newDefs: string[]): boolean {
        const a = Array.isArray(oldDefs) ? [...oldDefs].sort() : [];
        const b = [...newDefs].sort();
        if (a.length !== b.length) {
            return false;
        }
        return a.every((value, index) => value === b[index]);
    }
}
