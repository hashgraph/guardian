import { Migration } from '@mikro-orm/migrations-mongodb';
import { ObjectId } from 'mongodb';

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
}
