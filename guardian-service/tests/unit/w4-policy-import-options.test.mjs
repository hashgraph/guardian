import assert from 'node:assert/strict';
import { ImportPolicyOptions } from '../../dist/helpers/import-helpers/policy/policy-import.interface.js';

describe('ImportPolicyOptions', () => {
    const logger = { info: () => {} };

    it('stores the logger from the constructor', () => {
        const options = new ImportPolicyOptions(logger);
        assert.equal(options.logger, logger);
    });

    it('leaves other fields undefined initially', () => {
        const options = new ImportPolicyOptions(logger);
        assert.equal(options.policyComponents, undefined);
        assert.equal(options.user, undefined);
        assert.equal(options.versionOfTopicId, undefined);
        assert.equal(options.additionalPolicyConfig, undefined);
        assert.equal(options.metadata, undefined);
        assert.equal(options.importRecords, undefined);
    });

    it('setComponents stores the components and returns this', () => {
        const options = new ImportPolicyOptions(logger);
        const components = { policy: {} };
        assert.equal(options.setComponents(components), options);
        assert.equal(options.policyComponents, components);
    });

    it('setUser stores the user and returns this', () => {
        const options = new ImportPolicyOptions(logger);
        const user = { creator: 'did:me' };
        assert.equal(options.setUser(user), options);
        assert.equal(options.user, user);
    });

    it('setParentPolicyTopic stores the topic id', () => {
        const options = new ImportPolicyOptions(logger);
        assert.equal(options.setParentPolicyTopic('0.0.1'), options);
        assert.equal(options.versionOfTopicId, '0.0.1');
    });

    it('setParentPolicyTopic accepts null', () => {
        const options = new ImportPolicyOptions(logger);
        options.setParentPolicyTopic(null);
        assert.equal(options.versionOfTopicId, null);
    });

    it('setAdditionalPolicy stores the partial policy', () => {
        const options = new ImportPolicyOptions(logger);
        const policy = { name: 'override' };
        assert.equal(options.setAdditionalPolicy(policy), options);
        assert.equal(options.additionalPolicyConfig, policy);
    });

    it('setMetadata stores the metadata', () => {
        const options = new ImportPolicyOptions(logger);
        const metadata = { tools: {} };
        assert.equal(options.setMetadata(metadata), options);
        assert.equal(options.metadata, metadata);
    });

    it('setImportRecords coerces undefined to false', () => {
        const options = new ImportPolicyOptions(logger);
        assert.equal(options.setImportRecords(undefined), options);
        assert.equal(options.importRecords, false);
    });

    it('setImportRecords coerces truthy values to true', () => {
        const options = new ImportPolicyOptions(logger);
        options.setImportRecords(1);
        assert.equal(options.importRecords, true);
    });

    it('setImportRecords keeps boolean true', () => {
        const options = new ImportPolicyOptions(logger);
        options.setImportRecords(true);
        assert.equal(options.importRecords, true);
    });

    it('setImportRecords coerces false to false', () => {
        const options = new ImportPolicyOptions(logger);
        options.setImportRecords(false);
        assert.equal(options.importRecords, false);
    });

    it('validate throws when components are missing', () => {
        const options = new ImportPolicyOptions(logger).setUser({ creator: 'd' });
        assert.throws(() => options.validate(), /Invalid import parameters: policy components/);
    });

    it('validate throws when the user is missing', () => {
        const options = new ImportPolicyOptions(logger).setComponents({ policy: {} });
        assert.throws(() => options.validate(), /Invalid import parameters: user/);
    });

    it('validate returns this when components and user are present', () => {
        const options = new ImportPolicyOptions(logger)
            .setComponents({ policy: {} })
            .setUser({ creator: 'd' });
        assert.equal(options.validate(), options);
    });

    it('supports full chaining of all setters', () => {
        const options = new ImportPolicyOptions(logger)
            .setComponents({ policy: {} })
            .setUser({ creator: 'd' })
            .setParentPolicyTopic('0.0.2')
            .setAdditionalPolicy({ name: 'n' })
            .setMetadata({ tools: { a: 'b' } })
            .setImportRecords(true);
        assert.equal(options.versionOfTopicId, '0.0.2');
        assert.deepEqual(options.metadata, { tools: { a: 'b' } });
        assert.equal(options.importRecords, true);
        assert.equal(options.validate(), options);
    });
});
