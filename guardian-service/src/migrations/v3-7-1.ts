import { Migration } from '@mikro-orm/migrations-mongodb';
import { ObjectId } from 'mongodb';
import path from 'node:path';
import * as fs from 'node:fs';
import { IwaVersion } from '@guardian/interfaces';

/**
 * Migration to version 3.7.1
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.wrapSchemaTemplateBindingInArray();
        await this.remapPolicySchemaTemplateIds();
        await this.dropMeecoIssuerWhitelist();
        await this.applyDescriptions('policy-properties.csv', IwaVersion.V1);
        await this.applyDescriptions('policy-properties-v3.csv', IwaVersion.V3);
    }

    /**
     * Drops the issuer whitelist left over from the Meeco Wallet integration.
     * Lives here rather than in auth-service because both services share one
     * database, so a second v3-7-1 would be recorded as applied and skipped.
     */
    async dropMeecoIssuerWhitelist() {
        const collectionName = 'MeecoIssuerWhitelist';
        const db = this.driver.getConnection().getDb();
        const exists = await db
            .listCollections({ name: collectionName }, { nameOnly: true })
            .hasNext();
        if (!exists) {
            // Fresh database: nothing to drop, and drop() would throw NamespaceNotFound.
            return;
        }
        await this.getCollection(collectionName).drop();
    }

    /**
     * A policy can now have more than one applied schema template, so the
     * single `schemaTemplate` binding becomes a `schemaTemplates` array.
     */
    async wrapSchemaTemplateBindingInArray() {
        const policiesCollection = this.getCollection('Policy');
        const policies = policiesCollection.find(
            { schemaTemplate: { $exists: true, $ne: null } },
            { session: this.ctx }
        );
        while (await policies.hasNext()) {
            const policy = await policies.next();
            await policiesCollection.updateOne(
                { _id: policy._id },
                { $set: { schemaTemplates: [policy.schemaTemplate] } },
                { session: this.ctx }
            );
        }
        await policiesCollection.updateMany(
            { schemaTemplate: { $exists: true } },
            { $unset: { schemaTemplate: '' } },
            { session: this.ctx }
        );
    }

    /**
     * Repoints each schema's templateId to match its binding's, using the binding's
     * own schemaMap to scope the update. Scoping by policy topic instead would be
     * wrong, since re-imported policy versions can share a topic across different templates.
     */
    async remapPolicySchemaTemplateIds() {
        const policiesCollection = this.getCollection('Policy');
        const schemasCollection = this.getCollection('Schema');
        const policies = policiesCollection.find(
            { schemaTemplates: { $exists: true, $ne: null } },
            { session: this.ctx }
        );
        while (await policies.hasNext()) {
            const policy = await policies.next();
            for (const binding of policy?.schemaTemplates || []) {
                const templateId = binding?.templateId;
                if (!templateId) {
                    continue;
                }
                const schemaIds = Object.values(binding.schemaMap || {})
                    .map((id) => this.toObjectId(id))
                    .filter((id) => !!id);
                if (!schemaIds.length) {
                    continue;
                }
                await schemasCollection.updateMany(
                    {
                        _id: { $in: schemaIds },
                        templateId: { $exists: true, $nin: [null, '', templateId] }
                    },
                    { $set: { templateId } },
                    { session: this.ctx }
                );
            }
        }
    }

    /** A schemaMap value that is not a usable id is skipped rather than throwing. */
    toObjectId(value: any): ObjectId | null {
        try {
            return new ObjectId(String(value));
        } catch {
            return null;
        }
    }

    /**
     * Backfills a `description` (sourced from the IWA dMRV specification) onto
     * PolicyProperty rows already seeded by v2-18-0 (IWA v1) and v3-7-0 (IWA v3).
     * Enrichment only: never inserts a row, and never overwrites a description
     * with a blank one - IWA v1's legacy property names have no real IWA source,
     * so their CSV description column is empty and those rows are left untouched.
     *
     * @param fileName CSV file under migrations/artifacts, `title,value,"description"`
     * @param iwaVersion Which PolicyProperty rows this file's descriptions apply to
     */
    async applyDescriptions(fileName: string, iwaVersion: string): Promise<void> {
        const collection = this.getCollection('policy_property');
        const filePath = path.join(process.cwd(), 'src', 'migrations', 'artifacts', fileName);
        const data = await fs.promises.readFile(filePath, 'utf8');

        for (const row of data.split('\n')) {
            const line = row.replace(/\r$/, '');
            if (!line.trim()) {
                continue;
            }
            const columns = this.parseCsvLine(line);
            if (columns.length < 2 || !columns[0]) {
                continue;
            }
            const title = columns[0].trim();
            const description = (columns[2] || '').trim();
            if (!description) {
                continue;
            }
            // v1 rows may still be untagged if this ever runs ahead of v3-7-0's backfill.
            const filter = iwaVersion === IwaVersion.V1
                ? { title, $or: [{ iwaVersion: { $exists: false } }, { iwaVersion: IwaVersion.V1 }] }
                : { title, iwaVersion };
            await collection.updateMany(filter, { $set: { description } });
        }
    }

    /**
     * Parses one CSV line, supporting double-quoted fields (with "" as an escaped
     * quote) so a description column containing commas isn't split into extra columns.
     */
    parseCsvLine(line: string): string[] {
        const columns: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (inQuotes) {
                if (char === '"') {
                    if (line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += char;
                }
                continue;
            }

            if (char === '"' && current === '') {
                inQuotes = true;
                continue;
            }
            if (char === ',') {
                columns.push(current);
                current = '';
                continue;
            }
            current += char;
        }
        columns.push(current);

        return columns;
    }
}
