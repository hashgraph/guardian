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
     * A template id is local to the instance that issued it. Policy import re-pointed
     * the binding at the locally resolved template but left the schemas carrying the
     * source instance's id, so an imported policy has a binding and schemas naming
     * two different templates. That was harmless while lock resolution read "the one
     * binding"; it stops being harmless as soon as a policy can hold several and the
     * schema's own id is the only way to tell them apart.
     *
     * The binding's own schemaMap is what says which schemas the template created, so
     * the repair is scoped to those ids. Scoping by policy topic instead would be
     * wrong: a policy imported as a new version reuses the previous version's topic,
     * so two policies bound to two different templates can share one, and each pass
     * would overwrite the other's markers.
     *
     * Every binding is repaired, not just the first: wrapSchemaTemplateBindingInArray
     * only ever produces one, but a policy imported from a peer instance already
     * running multi-template import can already carry several by the time this runs.
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
