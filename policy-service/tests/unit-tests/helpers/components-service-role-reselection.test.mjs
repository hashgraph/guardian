import { assert } from 'chai';
import esmock from 'esmock';

const { ComponentsService } = await esmock.strict(
    '../../../dist/policy-engine/helpers/components-service.js',
    {
        '@guardian/common': {
            DatabaseServer: class {},
            PinoLogger: class {},
            TopicConfig: class {},
            Users: class {},
            VcHelper: class {},
        },
        '@guardian/interfaces': {
            GenerateUUIDv4: () => 'uuid',
            PolicyHelper: { isDryRunMode: () => true },
            PolicyStatus: { PUBLISH: 'PUBLISH' },
            SchemaStatus: { VIEW: 'VIEW' },
        },
        '../../../dist/policy-engine/record/index.js': {
            Recording: class {},
            Running: class {},
        },
    },
);

function makeService() {
    return new ComponentsService({
        owner: 'did:owner',
        ownerId: 'owner-1',
        topicId: '0.0.1',
        status: 'DRY-RUN',
    }, 'policy-1');
}

describe('@unit ComponentsService role reselection', () => {
    it('allows a role-only policy to clear the active role', async () => {
        const service = makeService();
        const calls = [];
        service.databaseServer.setActiveGroup = async (...args) => calls.push(args);

        assert.deepEqual(service.getGroupTemplates(), []);
        assert.equal(await service.selectGroup({ did: 'did:user' }, null), true);
        assert.deepEqual(calls, [['policy-1', 'did:user', null]]);
    });

    it('allows a role-only policy to reactivate a previous role record', async () => {
        const service = makeService();
        const calls = [];
        service.databaseServer.setActiveGroup = async (...args) => calls.push(args);

        assert.equal(await service.selectGroup({ did: 'did:user' }, 'role-record-1'), true);
        assert.deepEqual(calls, [['policy-1', 'did:user', 'role-record-1']]);
    });
});
